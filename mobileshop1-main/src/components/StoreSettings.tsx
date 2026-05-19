import { useEffect, useState } from 'react';
import { fetchCategories, createCategory, patchCategory, removeCategory } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import type { Category } from '../lib/types';
import { Plus, Pencil, Trash2, X, Check, Tag, AlertTriangle } from 'lucide-react';

export default function StoreSettings() {
  const { tenantId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadCategories() {
    if (!tenantId) { setLoading(false); return; }
    try {
      setCategories(await fetchCategories(tenantId));
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { loadCategories(); }, [tenantId]);

  function resetForm() { setFormName(''); setFormDescription(''); setError(''); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!formName.trim()) { setError('Category name is required.'); return; }
    if (!tenantId) { setError('Store session not available. Please sign in again.'); return; }
    setSaving(true);
    try {
      const slug = formName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
      const { error: insertError } = await createCategory(tenantId, {
        name: formName.trim(),
        slug,
        description: formDescription.trim(),
      });
      if (insertError) {
        if (insertError.code === '23505') { setError('A category with this name already exists.'); }
        else { setError(insertError.message); }
        setSaving(false); return;
      }
      setShowAddForm(false);
      resetForm();
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to add category.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setError('');
  }

  async function handleSaveEdit(id: string) {
    setError('');
    if (!editName.trim()) { setError('Category name cannot be empty.'); return; }
    setSaving(true);
    try {
      const slug = editName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
      const { error: updateError } = await patchCategory(id, {
        name: editName.trim(),
        slug,
        description: editDescription.trim(),
      });
      if (updateError) {
        if (updateError.code === '23505') { setError('A category with this name already exists.'); }
        else { setError(updateError.message); }
        setSaving(false); return;
      }
      setEditingId(null);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    setSaving(true);
    try {
      const { error: deleteError } = await removeCategory(id);
      if (deleteError) { setError(deleteError.message); setSaving(false); return; }
      setDeleteConfirmId(null);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Manage Categories</h3>
          <p className="text-sm text-slate-500 mt-0.5">Add, edit, and delete the product categories for your store.</p>
        </div>
        <button onClick={() => { resetForm(); setShowAddForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Add Category Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add Category</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Covers, Screen Protectors, Chargers" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 ring-1 ring-red-200 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="text-base font-semibold text-slate-900">Delete Category</h3><p className="text-sm text-slate-500">This cannot be undone.</p></div>
            </div>
            <p className="text-sm text-slate-600 mb-4">Products in this category will not be deleted, but they will lose their category assignment.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={saving} className="flex-1 py-2.5 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const isEditing = editingId === cat.id;
          return (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {isEditing ? (
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(cat.id)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Tag className="w-4 h-4 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{cat.name}</p>
                    {cat.description && <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>}
                  </div>
                  <span className="text-xs text-slate-400">{cat.slug}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditing(cat)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(cat.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {categories.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium text-slate-500 mb-1">No categories yet</p>
            <p className="text-sm mb-4">Create your first category to organize your products</p>
            <button onClick={() => { resetForm(); setShowAddForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
