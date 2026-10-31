"use client";

import { useEffect, useState } from "react";
import { CmsPageItem, api } from "@/lib/api";
import { toast } from "@/lib/toast";

export function PagesTab() {
  const [pages, setPages] = useState<CmsPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPageItem | null>(null);
  const [deletingPage, setDeletingPage] = useState<CmsPageItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const items = await api.getCmsPages();
      setPages(items);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load CMS pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const openAddModal = () => {
    setTitle("");
    setSlug("");
    setContent("");
    setMetaTitle("");
    setMetaDescription("");
    setIsPublished(true);
    setIsAddOpen(true);
  };

  const openEditModal = (page: CmsPageItem) => {
    setEditingPage(page);
    setTitle(page.title);
    setSlug(page.slug);
    setContent(page.content);
    setMetaTitle(page.metaTitle || "");
    setMetaDescription(page.metaDescription || "");
    setIsPublished(page.isPublished);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) {
      toast.error("Title and slug are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createCmsPage({
        title: title.trim(),
        slug: slug.trim(),
        content,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        isPublished,
      });
      toast.success(`Page "${title}" published successfully!`);
      setIsAddOpen(false);
      fetchPages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create CMS page");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    setSubmitting(true);
    try {
      await api.updateCmsPage({
        id: editingPage.id,
        title: title.trim(),
        slug: slug.trim(),
        content,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        isPublished,
      });
      toast.success(`Page "${title}" updated successfully!`);
      setEditingPage(null);
      fetchPages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update CMS page");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;
    setSubmitting(true);
    try {
      await api.deleteCmsPage(deletingPage.id);
      toast.success(`Page "${deletingPage.title}" deleted.`);
      setDeletingPage(null);
      fetchPages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b2f8a] via-[#103a9f] to-[#0b2f8a] p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#dfb755]/20 border border-[#dfb755]/40 text-[#dfb755] text-xs font-bold tracking-wide uppercase">
                📄 Content Management System
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Website CMS Pages & Policies
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Create, edit, publish, and control all static marketing, policy, and information pages shown across the Vardayini website.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold btn-gold shadow-sm transition shrink-0"
          >
            <span>➕</span>
            <span>Create New Page</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#0b2f8a]/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search pages by title or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-[#0b2f8a]/20 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
          />
          <span className="absolute left-3 top-2.5 text-xs text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={fetchPages}
          disabled={loading}
          className="p-2 rounded-xl border border-[#0b2f8a]/15 text-[#0b2f8a] hover:bg-[#0b2f8a]/5 transition disabled:opacity-50 text-xs font-semibold flex items-center gap-1 self-start sm:self-auto"
          title="Refresh pages"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-2xl border border-[#0b2f8a]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0b2f8a]"></div>
            <span>Loading website pages...</span>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No CMS pages found. Click "Create New Page" to publish your first content page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-[#0b2f8a]/10 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Page Title</th>
                  <th className="py-3.5 px-4">URL Slug</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SEO Metadata</th>
                  <th className="py-3.5 px-4">Last Modified</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{page.title}</div>
                      <div className="text-[11px] text-gray-500 line-clamp-1 max-w-xs">
                        {page.content.replace(/<[^>]*>?/gm, "").slice(0, 70)}...
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <a
                        href={`http://localhost:9449/pages/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] bg-blue-50 text-[#0b2f8a] hover:underline px-2 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1"
                        title="View page live on storefront"
                      >
                        <span>/pages/{page.slug}</span>
                        <span>↗</span>
                      </a>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${page.isPublished
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${page.isPublished ? "bg-emerald-600" : "bg-gray-400"
                            }`}
                        ></span>
                        {page.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 text-[11px]">
                      {page.metaTitle ? (
                        <div className="truncate max-w-[180px] font-medium" title={page.metaTitle}>
                          🏷️ {page.metaTitle}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No custom meta</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                      {page.updatedAt
                        ? new Date(page.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                        : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(page)}
                          className="px-2.5 py-1 rounded-lg border border-[#0b2f8a]/15 text-[#0b2f8a] hover:bg-[#0b2f8a]/10 font-semibold text-[11px] transition flex items-center gap-1"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeletingPage(page)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-[11px] transition flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isAddOpen || editingPage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-[#0b2f8a] to-[#103a9f] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>{isAddOpen ? "➕" : "✏️"}</span>
                  <span>{isAddOpen ? "Create CMS Page" : `Edit Page: ${editingPage?.title}`}</span>
                </h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Configure page title, public URL slug, body content, and SEO meta tags.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingPage(null);
                }}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={isAddOpen ? handleCreate : handleUpdate}
              className="p-6 flex flex-col gap-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terms & Conditions"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (isAddOpen && !slug) {
                        setSlug(generateSlug(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    URL Slug *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 rounded-l-xl bg-gray-100 border border-r-0 border-gray-300 text-gray-500 font-mono text-[11px]">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="terms-and-conditions"
                      value={slug}
                      onChange={(e) => setSlug(generateSlug(e.target.value))}
                      className="w-full px-3 py-2 rounded-r-xl border border-gray-300 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Page Content (HTML / Markdown supported) *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Enter page text, sections, headings, policies..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30 focus:border-[#0b2f8a]"
                ></textarea>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col gap-3">
                <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>SEO & Search Engine Metadata (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 text-[11px] font-medium mb-1">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Terms of Service | Vardayini Sweets"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 text-[11px] font-medium mb-1">
                      Meta Description
                    </label>
                    <input
                      type="text"
                      placeholder="Short summary for Google search previews"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0b2f8a]/30"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-[#0b2f8a] focus:ring-[#0b2f8a]"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-800">
                    Publish immediately to public website
                  </span>
                  <div className="text-[11px] text-gray-500">
                    If unchecked, this page is saved as an unlisted draft.
                  </div>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingPage(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl btn-gold font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : isAddOpen ? "Publish Page" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            <div className="bg-rose-600 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>⚠️</span> Delete Page
                </h3>
              </div>
              <button
                onClick={() => setDeletingPage(null)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <p className="text-gray-700 text-sm">
                Are you sure you want to delete{" "}
                <span className="font-bold text-gray-900">"{deletingPage.title}"</span> (
                /{deletingPage.slug})?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                This will remove the page from the website immediately. Links pointing to /{deletingPage.slug} will return a 404.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingPage(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
