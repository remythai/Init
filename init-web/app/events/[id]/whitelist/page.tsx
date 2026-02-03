"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  Phone,
  User,
  Trash2,
  RotateCcw,
  X,
  Check,
  AlertCircle,
  FileText,
  Edit2,
} from "lucide-react";
import { authService } from "../../../services/auth.service";
import { whitelistService, WhitelistEntry, ImportStats } from "../../../services/whitelist.service";

export default function WhitelistPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);

  // Add phone modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit phone modal
  const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      if (validatedType !== "orga") {
        router.push("/events");
        return;
      }

      loadData();
    };

    initPage();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load event info
      const eventResponse = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEventName(eventData.data?.name || "");
      }

      // Load whitelist
      const whitelistData = await whitelistService.getWhitelist(eventId, showRemoved);
      setEntries(whitelistData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Reload when showRemoved changes
  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [showRemoved]);

  const handleAddPhone = async () => {
    if (!newPhone.trim()) {
      setAddError("Veuillez entrer un numero de telephone");
      return;
    }

    try {
      setAdding(true);
      setAddError("");
      await whitelistService.addPhone(eventId, newPhone);
      setNewPhone("");
      setShowAddModal(false);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'ajout";
      setAddError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportStats(null);
      const stats = await whitelistService.importFile(eventId, file);
      setImportStats(stats);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'import";
      setError(message);
      setShowImportModal(false);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async (phone: string, permanent = false) => {
    const confirmMessage = permanent
      ? "Supprimer definitivement ce numero ? Cette action supprimera aussi ses matchs et messages."
      : "Retirer ce numero de la whitelist ?";

    if (!confirm(confirmMessage)) return;

    try {
      await whitelistService.removePhone(eventId, phone, permanent);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    }
  };

  const handleReactivate = async (phone: string) => {
    try {
      await whitelistService.reactivatePhone(eventId, phone);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    }
  };

  const handleEditPhone = async () => {
    if (!editingEntry || !editPhone.trim()) {
      setEditError("Veuillez entrer un numero de telephone");
      return;
    }

    try {
      setEditing(true);
      setEditError("");
      await whitelistService.updatePhone(eventId, editingEntry.phone, editPhone);
      setEditingEntry(null);
      setEditPhone("");
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la modification";
      setEditError(message);
    } finally {
      setEditing(false);
    }
  };

  const openEditModal = (entry: WhitelistEntry) => {
    setEditingEntry(entry);
    setEditPhone(whitelistService.formatPhoneDisplay(entry.phone));
    setEditError("");
  };

  const filteredEntries = entries.filter((e) => {
    const phone = whitelistService.formatPhoneDisplay(e.phone).toLowerCase();
    const name = `${e.firstname || ""} ${e.lastname || ""}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return phone.includes(query) || name.includes(query);
  });

  const activeCount = entries.filter((e) => e.status === "active").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la whitelist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-poppins text-2xl font-bold text-[#303030]">
                Whitelist
              </h1>
              {eventName && (
                <p className="text-gray-600 mt-1">{eventName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Phone className="w-5 h-5 text-[#1271FF]" />
              <span className="font-semibold text-[#303030]">{activeCount}</span>
              {removedCount > 0 && (
                <span className="text-gray-400 text-sm">({removedCount} retires)</span>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1271FF] text-white rounded-full hover:bg-[#0d5dd8] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#303030] rounded-full shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <label className="flex items-center gap-2 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={showRemoved}
                onChange={(e) => setShowRemoved(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1271FF] focus:ring-[#1271FF]"
              />
              <span className="text-sm text-gray-600">Afficher les retires</span>
            </label>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par telephone ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030] placeholder-gray-400"
            />
          </div>

          {/* List */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {searchQuery
                  ? "Aucun resultat pour cette recherche"
                  : "Aucun numero dans la whitelist"}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Ajoutez des numeros pour limiter l'acces a l'evenement
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-white rounded-xl p-4 shadow-sm flex items-center justify-between ${
                    entry.status === "removed" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        entry.status === "removed"
                          ? "bg-gray-200"
                          : entry.user_id
                          ? "bg-green-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {entry.user_id ? (
                        <User className={`w-6 h-6 ${entry.status === "removed" ? "text-gray-400" : "text-green-600"}`} />
                      ) : (
                        <Phone className={`w-6 h-6 ${entry.status === "removed" ? "text-gray-400" : "text-blue-600"}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#303030]">
                        {whitelistService.formatPhoneDisplay(entry.phone)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {entry.firstname && entry.lastname && (
                          <span className="text-sm text-gray-600">
                            {entry.firstname} {entry.lastname}
                          </span>
                        )}
                        {entry.user_id && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Inscrit
                          </span>
                        )}
                        {entry.status === "removed" && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Retire
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {entry.source === "manual" ? "Manuel" : entry.source.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.status === "active" ? (
                      <>
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-2 text-gray-400 hover:text-[#1271FF] hover:bg-blue-50 rounded-full transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRemove(entry.phone, false)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Retirer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleReactivate(entry.phone)}
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                          title="Reactiver"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRemove(entry.phone, true)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Supprimer definitivement"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Phone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !adding && setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Ajouter un numero
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={adding}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numero de telephone
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030]"
                />
                {addError && (
                  <p className="text-red-500 text-sm mt-2">{addError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={adding}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPhone}
                  disabled={adding}
                  className="flex-1 py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                >
                  {adding ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phone Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !editing && setEditingEntry(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Modifier le numero
              </h2>
              <button
                onClick={() => setEditingEntry(null)}
                disabled={editing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau numero de telephone
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030]"
                />
                {editError && (
                  <p className="text-red-500 text-sm mt-2">{editError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingEntry(null)}
                  disabled={editing}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditPhone}
                  disabled={editing}
                  className="flex-1 py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                >
                  {editing ? "Modification..." : "Modifier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !importing && setShowImportModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Importer des numeros
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStats(null);
                }}
                disabled={importing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            {importStats ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Check className="w-5 h-5" />
                    Import termine
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Total :</span>{" "}
                      <span className="font-medium">{importStats.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ajoutes :</span>{" "}
                      <span className="font-medium text-green-600">{importStats.added}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Doublons :</span>{" "}
                      <span className="font-medium">{importStats.skipped_duplicate}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Deja retires :</span>{" "}
                      <span className="font-medium">{importStats.skipped_removed}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Invalides :</span>{" "}
                      <span className="font-medium text-red-600">{importStats.invalid}</span>
                    </div>
                  </div>
                </div>

                {importStats.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                    <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                      <AlertCircle className="w-5 h-5" />
                      Erreurs ({importStats.errors.length})
                    </div>
                    <ul className="text-sm text-red-600 space-y-1">
                      {importStats.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>
                          {err.phone}: {err.reason}
                        </li>
                      ))}
                      {importStats.errors.length > 10 && (
                        <li>... et {importStats.errors.length - 10} autres</li>
                      )}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportStats(null);
                  }}
                  className="w-full py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#0d5dd8] transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Formats acceptes : CSV ou XML
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      <strong>CSV :</strong> Un numero par ligne ou separes par virgule/point-virgule
                    </p>
                    <p>
                      <strong>XML :</strong> Balises &lt;phone&gt;, &lt;tel&gt; ou &lt;numero&gt;
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xml,.txt"
                  onChange={handleImportFile}
                  className="hidden"
                  id="import-file"
                />

                <label
                  htmlFor="import-file"
                  className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1271FF] hover:bg-blue-50 transition-colors ${
                    importing ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {importing ? (
                    <>
                      <div className="w-8 h-8 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Import en cours...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-10 h-10 text-gray-400" />
                      <span className="text-gray-600">Cliquez pour selectionner un fichier</span>
                    </>
                  )}
                </label>

                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="w-full py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
