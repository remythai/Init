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
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { authService } from "../../../services/auth.service";
import { whitelistService, WhitelistEntry, ImportStats, CSVPreview } from "../../../services/whitelist.service";

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

  // Selection state
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // CSV Preview state
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");

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
      // Clear selection when reloading
      setSelectedPhones(new Set());
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    // For XML files, import directly
    if (extension === 'xml') {
      handleDirectImport(file);
      return;
    }

    // For CSV files, show preview for column selection
    try {
      setImporting(true);
      const content = await readFileContent(file);
      setCsvContent(content);

      // Check if it looks like a multi-column CSV
      const preview = await whitelistService.previewCSV(eventId, content);

      if (preview.headers.length > 1) {
        // Multi-column CSV - show preview for column selection
        setCsvPreview(preview);
        setSelectedColumn(null);
      } else {
        // Single column - import directly
        handleDirectImport(file);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la lecture du fichier";
      setError(message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file);
    });
  };

  const handleDirectImport = async (file: File) => {
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
    }
  };

  const handleImportWithColumn = async () => {
    if (selectedColumn === null || !csvContent) return;

    try {
      setImporting(true);
      const stats = await whitelistService.importContent(eventId, csvContent, 'csv', selectedColumn);
      setImportStats(stats);
      setCsvPreview(null);
      setCsvContent("");
      setSelectedColumn(null);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'import";
      setError(message);
    } finally {
      setImporting(false);
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

  const handleBulkRemove = async (permanent: boolean) => {
    if (selectedPhones.size === 0) return;

    try {
      setBulkDeleting(true);
      const phones = Array.from(selectedPhones);
      await whitelistService.bulkRemove(eventId, phones, permanent);
      setShowBulkDeleteModal(false);
      setSelectedPhones(new Set());
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      alert(message);
    } finally {
      setBulkDeleting(false);
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

  // Selection handlers
  const toggleSelect = (phone: string) => {
    const newSelected = new Set(selectedPhones);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedPhones(newSelected);
  };

  const selectAll = () => {
    const activePhones = filteredEntries
      .filter(e => e.status === 'active')
      .map(e => e.phone);
    setSelectedPhones(new Set(activePhones));
  };

  const deselectAll = () => {
    setSelectedPhones(new Set());
  };

  const filteredEntries = entries.filter((e) => {
    const phone = whitelistService.formatPhoneDisplay(e.phone).toLowerCase();
    const name = `${e.firstname || ""} ${e.lastname || ""}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return phone.includes(query) || name.includes(query);
  });

  const activeEntries = filteredEntries.filter(e => e.status === 'active');
  const activeCount = entries.filter((e) => e.status === "active").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;
  const registeredCount = entries.filter((e) => e.status === "active" && e.user_id).length;
  const pendingCount = activeCount - registeredCount;

  const allActiveSelected = activeEntries.length > 0 && activeEntries.every(e => selectedPhones.has(e.phone));
  const someSelected = selectedPhones.size > 0 && !allActiveSelected;

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
        <div className="max-w-7xl mx-auto px-3 md:px-8 py-2 md:py-3 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-8 md:h-12 w-auto"
            />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-xs md:text-sm transition-colors flex items-center gap-1 md:gap-2"
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
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Phone className="w-4 h-4" />
                Total
              </div>
              <p className="text-2xl font-bold text-[#303030]">{activeCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <User className="w-4 h-4" />
                Inscrits
              </div>
              <p className="text-2xl font-bold text-green-600">{registeredCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                <Phone className="w-4 h-4" />
                En attente
              </div>
              <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Trash2 className="w-4 h-4" />
                Retires
              </div>
              <p className="text-2xl font-bold text-gray-400">{removedCount}</p>
            </div>
          </div>

          {/* Conversion rate */}
          {activeCount > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Taux de conversion</span>
                <span className="text-sm font-semibold text-[#303030]">
                  {Math.round((registeredCount / activeCount) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(registeredCount / activeCount) * 100}%` }}
                />
              </div>
            </div>
          )}

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

            {selectedPhones.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ({selectedPhones.size})
              </button>
            )}

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

          {/* Search + Selection */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par telephone ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030] placeholder-gray-400"
              />
            </div>
            {activeEntries.length > 0 && (
              <button
                onClick={allActiveSelected ? deselectAll : selectAll}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#303030] rounded-full shadow-sm hover:bg-gray-50 transition-colors"
              >
                {allActiveSelected ? (
                  <>
                    <MinusSquare className="w-4 h-4" />
                    Desélectionner
                  </>
                ) : someSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Tout sélectionner
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    Tout sélectionner
                  </>
                )}
              </button>
            )}
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
                  className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 ${
                    entry.status === "removed" ? "opacity-60" : ""
                  } ${selectedPhones.has(entry.phone) ? "ring-2 ring-[#1271FF]" : ""}`}
                >
                  {/* Checkbox */}
                  {entry.status === "active" && (
                    <button
                      onClick={() => toggleSelect(entry.phone)}
                      className="flex-shrink-0 p-1"
                    >
                      {selectedPhones.has(entry.phone) ? (
                        <CheckSquare className="w-5 h-5 text-[#1271FF]" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                  )}
                  {entry.status === "removed" && <div className="w-7" />}

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
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
                      {!entry.user_id && entry.status === "active" && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          En attente
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

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
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
            onClick={() => !importing && !csvPreview && setShowImportModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-lg mx-4 w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                {csvPreview ? "Sélectionner la colonne" : "Importer des numeros"}
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStats(null);
                  setCsvPreview(null);
                  setCsvContent("");
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
            ) : csvPreview ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Votre fichier contient {csvPreview.headers.length} colonnes et {csvPreview.totalRows} lignes.
                  Cliquez sur la colonne contenant les numéros de téléphone :
                </p>

                {/* Table preview */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {csvPreview.headers.map((header) => (
                          <th
                            key={header.index}
                            onClick={() => setSelectedColumn(header.index)}
                            className={`px-3 py-2 text-left font-medium cursor-pointer transition-colors ${
                              selectedColumn === header.index
                                ? "bg-[#1271FF] text-white"
                                : "text-[#303030] hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedColumn === header.index && (
                                <Check className="w-4 h-4" />
                              )}
                              {header.name || `Col ${header.index + 1}`}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.preview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-gray-100">
                          {csvPreview.headers.map((header) => (
                            <td
                              key={header.index}
                              onClick={() => setSelectedColumn(header.index)}
                              className={`px-3 py-2 cursor-pointer transition-colors ${
                                selectedColumn === header.index
                                  ? "bg-blue-50 text-[#1271FF] font-medium"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {row[header.index] || <span className="text-gray-300">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedColumn !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Colonne sélectionnée :</strong> {csvPreview.headers[selectedColumn]?.name || `Colonne ${selectedColumn + 1}`}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {csvPreview.totalRows} numéros seront importés depuis cette colonne
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCsvPreview(null);
                      setCsvContent("");
                      setSelectedColumn(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleImportWithColumn}
                    disabled={selectedColumn === null || importing}
                    className="flex-1 py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                  >
                    {importing ? "Import..." : "Importer"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Formats acceptes : CSV ou XML
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      <strong>CSV :</strong> Un numero par ligne ou plusieurs colonnes (selection de colonne)
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
                  onChange={handleFileSelect}
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
                      <span className="text-gray-600">Lecture en cours...</span>
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

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Supprimer {selectedPhones.size} numero{selectedPhones.size > 1 ? "s" : ""}
              </h2>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Choisissez le type de suppression :
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleBulkRemove(false)}
                disabled={bulkDeleting}
                className="w-full p-4 rounded-xl border-2 border-orange-200 bg-orange-50 text-left hover:border-orange-300 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-orange-700">Retirer (soft)</div>
                <p className="text-sm text-orange-600 mt-1">
                  Les numeros seront retires mais pourront etre reactives. Les matchs seront archives.
                </p>
              </button>

              <button
                onClick={() => handleBulkRemove(true)}
                disabled={bulkDeleting}
                className="w-full p-4 rounded-xl border-2 border-red-200 bg-red-50 text-left hover:border-red-300 transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-red-700">Supprimer definitivement</div>
                <p className="text-sm text-red-600 mt-1">
                  Les numeros et toutes leurs donnees (matchs, messages) seront supprimes definitivement.
                </p>
              </button>

              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="w-full py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>

            {bulkDeleting && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
