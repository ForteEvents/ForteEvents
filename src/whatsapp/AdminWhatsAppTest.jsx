import { useCallback, useEffect, useState } from "react";

const API = "https://forteevents.onrender.com";

export default function AdminWhatsAppTest({ session, onBack }) {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Habari, huu ni ujumbe wa majaribio kutoka ForteEvents.");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const headers = {
    Authorization: `Bearer ${session?.access_token || ""}`,
    "Content-Type": "application/json",
  };

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError("");
    try {
      const [statusResponse, historyResponse] = await Promise.all([
        fetch(`${API}/api/whatsapp/status`, { headers }),
        fetch(`${API}/api/whatsapp/admin/messages?limit=20`, { headers }),
      ]);
      const statusData = await statusResponse.json().catch(() => ({}));
      const historyData = await historyResponse.json().catch(() => ({}));
      if (!statusResponse.ok) throw new Error(statusData.error || "Imeshindikana kukagua WhatsApp.");
      if (!historyResponse.ok) throw new Error(historyData.error || "Imeshindikana kupakia historia.");
      setStatus(statusData);
      setMessages(historyData.messages || []);
    } catch (err) {
      setError(err.message || "Hitilafu ya kuwasiliana na server.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const sendTest = async (event) => {
    event.preventDefault();
    setSending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${API}/api/whatsapp/send-test`, {
        method: "POST",
        headers,
        body: JSON.stringify({ to, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const missing = Array.isArray(data.missing) && data.missing.length
          ? ` Taarifa zinazokosekana: ${data.missing.join(", ")}.`
          : "";
        throw new Error((data.error || "Ujumbe haukutumwa.") + missing);
      }
      setNotice(`WhatsApp imekubali ujumbe wa majaribio. Message ID: ${data.messageId || "imepokelewa"}. Hakuna salio lililokatwa.`);
      await load();
    } catch (err) {
      setError(err.message || "Imeshindikana kutuma ujumbe.");
    } finally {
      setSending(false);
    }
  };

  const missing = status?.missing || [];
  const statusLabel = !status
    ? "Haijakaguliwa"
    : status.configured
      ? "Mipangilio imekamilika"
      : "Inahitaji mipangilio";

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>WhatsApp — Majaribio</h1>
          <p>Jaribu kutuma ujumbe mmoja na uone ujumbe pamoja na delivery status.</p>
        </div>
        <button className="secondary-button" onClick={onBack}>Rudi Dashboard</button>
      </div>

      {notice && <div className="card" role="status" style={{ borderLeft: "4px solid #b28a32", marginBottom: 16 }}>{notice}</div>}
      {error && <div className="card" role="alert" style={{ borderLeft: "4px solid #b42318", marginBottom: 16, color: "#b42318" }}>{error}</div>}

      <div className="dashboard-grid">
        <div className="card">
          <h3>Hali ya WhatsApp Cloud API</h3>
          <p><strong>{statusLabel}</strong></p>
          {status && <p>Graph API: {status.apiVersion}</p>}
          {missing.length > 0 && (
            <div>
              <p>Variables zinazohitajika kwenye Render:</p>
              <ul>{missing.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
            </div>
          )}
          <button className="secondary-button" onClick={load} disabled={loading}>
            {loading ? "Inakagua..." : "Kagua tena"}
          </button>
        </div>

        <div className="card">
          <h3>Tuma ujumbe mmoja wa majaribio</h3>
          <form onSubmit={sendTest}>
            <label htmlFor="whatsapp-test-phone">Namba ya WhatsApp ya mpokeaji</label>
            <input
              id="whatsapp-test-phone"
              type="tel"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="2557XXXXXXXX"
              required
              style={{ width: "100%", margin: "8px 0 14px", padding: 12, boxSizing: "border-box" }}
            />
            <label htmlFor="whatsapp-test-message">Ujumbe</label>
            <textarea
              id="whatsapp-test-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4096}
              rows={4}
              required
              style={{ width: "100%", margin: "8px 0 14px", padding: 12, boxSizing: "border-box" }}
            />
            <button className="primary-button" type="submit" disabled={sending || !to.trim() || !message.trim()}>
              {sending ? "Inatuma..." : "Tuma WhatsApp ya majaribio"}
            </button>
          </form>
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Jaribio hili linatuma kwa mpokeaji mmoja tu. Hakuna WhatsApp credits zinazokatwa.
            Kwa ujumbe wa kawaida, mpokeaji anatakiwa awe amekutumia ujumbe ndani ya saa 24;
            vinginevyo Meta huhitaji template iliyoidhinishwa.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Historia ya WhatsApp (ujumbe 20 wa mwisho)</h3>
        {loading ? <p>Inapakia historia...</p> : messages.length === 0 ? <p>Bado hakuna ujumbe wa WhatsApp uliohifadhiwa.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: 8 }}>Mwelekeo</th>
                <th style={{ textAlign: "left", padding: 8 }}>Namba</th>
                <th style={{ textAlign: "left", padding: 8 }}>Ujumbe</th>
                <th style={{ textAlign: "left", padding: 8 }}>Hali</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tarehe</th>
              </tr></thead>
              <tbody>
                {messages.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: 8 }}>{item.direction === "incoming" ? "Umeingia" : "Umetumwa"}</td>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{item.phone_number}</td>
                    <td style={{ padding: 8, minWidth: 180 }}>{item.message_text || "—"}</td>
                    <td style={{ padding: 8 }}>{item.status}</td>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{item.created_at ? new Date(item.created_at).toLocaleString("sw-TZ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
