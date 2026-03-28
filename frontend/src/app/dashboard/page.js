"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

const emptyForm = {
  title: "",
  description: "",
  durationMinutes: 30,
  slug: "",
};

export default function DashboardEventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards");

  const totalMinutes = eventTypes.reduce(
    (sum, eventType) => sum + Number(eventType.durationMinutes || 0),
    0
  );

  async function loadEventTypes() {
    const data = await api.getEventTypes();
    setEventTypes(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchAndSetEventTypes() {
      setLoading(true);
      try {
        const data = await api.getEventTypes();
        if (!cancelled) {
          setEventTypes(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAndSetEventTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  function fillFormForEdit(eventType) {
    setEditingId(eventType.id);
    setForm({
      title: eventType.title,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      slug: eventType.slug,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      if (editingId) {
        await api.updateEventType(editingId, {
          ...form,
          durationMinutes: Number(form.durationMinutes),
        });
      } else {
        await api.createEventType({
          ...form,
          durationMinutes: Number(form.durationMinutes),
        });
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadEventTypes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm("Delete this event type?");
    if (!shouldDelete) return;

    try {
      await api.deleteEventType(id);
      await loadEventTypes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <section>
        <div className="page-head">
          <div>
            <h1 className="page-title">Event Types</h1>
            <p className="page-subtitle">
              Manage your meeting templates and share public booking links.
            </p>
          </div>
          <div className="page-head-actions">
            <div className="view-toggle" role="group" aria-label="Event type display mode">
              <button
                type="button"
                className={
                  viewMode === "cards" ? "view-toggle-btn view-toggle-btn-active" : "view-toggle-btn"
                }
                onClick={() => setViewMode("cards")}
              >
                Cards
              </button>
              <button
                type="button"
                className={
                  viewMode === "list" ? "view-toggle-btn view-toggle-btn-active" : "view-toggle-btn"
                }
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
            <span className="page-head-pill">{eventTypes.length} active types</span>
          </div>
        </div>

        <div className="insight-row">
          <article className="insight-card">
            <p className="insight-label">Total event types</p>
            <p className="insight-value">{eventTypes.length}</p>
          </article>
          <article className="insight-card">
            <p className="insight-label">Combined duration</p>
            <p className="insight-value">{totalMinutes} min</p>
          </article>
          <article className="insight-card">
            <p className="insight-label">Quick tip</p>
            <p className="insight-help">Clear event titles improve booking conversion.</p>
          </article>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? <p className="page-subtitle">Loading event types...</p> : null}

        <form className="card form-grid event-editor-card" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit event type" : "New event type"}</h2>

          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </label>

          <label>
            Duration (minutes)
            <input
              type="number"
              min="5"
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
              }
              required
            />
          </label>

          <label>
            URL Slug
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="intro-call"
              required
            />
          </label>

          <div className="button-row">
            <button type="submit">{editingId ? "Update" : "Create"}</button>
            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {!loading && eventTypes.length === 0 ? (
          <section className="card empty-state-card">
            <h3>No event types yet</h3>
            <p>Create your first event type above to publish your first booking link.</p>
          </section>
        ) : null}

        {viewMode === "cards" ? (
          <div className="event-list">
            {eventTypes.map((eventType) => (
              <article key={eventType.id} className="card event-card">
                <h3 className="event-title">{eventType.title}</h3>
                <p>{eventType.description || "No description"}</p>
                <p className="event-meta">{eventType.durationMinutes} minutes</p>
                <p>
                  Public link: <Link href={`/book/${eventType.slug}`}>/book/{eventType.slug}</Link>
                </p>

                <div className="button-row">
                  <button onClick={() => fillFormForEdit(eventType)}>Edit</button>
                  <button className="danger-btn" onClick={() => handleDelete(eventType.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card event-table-wrap">
            <table className="event-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Public link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventTypes.map((eventType) => (
                  <tr key={eventType.id}>
                    <td>
                      <p className="event-table-title">{eventType.title}</p>
                      <p className="event-table-description">
                        {eventType.description || "No description"}
                      </p>
                    </td>
                    <td>{eventType.durationMinutes} min</td>
                    <td>
                      <Link href={`/book/${eventType.slug}`}>/book/{eventType.slug}</Link>
                    </td>
                    <td>
                      <div className="button-row">
                        <button onClick={() => fillFormForEdit(eventType)}>Edit</button>
                        <button className="danger-btn" onClick={() => handleDelete(eventType.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
