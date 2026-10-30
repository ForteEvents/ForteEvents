import { useCallback, useEffect, useState } from 'react'

const API = 'https://forteevents.onrender.com'

export default function WhatsAppPage({ session }) {
  const [recipientsText, setRecipientsText] = useState('')
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [configured, setConfigured] = useState(false)

  const headers = {
    Authorization: `Bearer ${session?.access_token || ''}`,
    'Content-Type': 'application/json',
  }

  const loadData = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const [balanceResponse, historyResponse, statusResponse] = await Promise.all([
        fetch(`${API}/api/whatsapp/balance`, { headers }),
        fetch(`${API}/api/whatsapp/history`, { headers }),
        fetch(`${API}/api/whatsapp/status`, { headers }),
      ])
      const [balanceData, historyData, statusData] = await Promise.all([
        balanceResponse.json(), historyResponse.json(), statusResponse.json(),
      ])
      if (!balanceResponse.ok || !balanceData.ok) throw new Error(balanceData.error || 'WhatsApp balance haijapatikana.')
      if (!historyResponse.ok || !historyData.ok) throw new Error(historyData.error || 'WhatsApp history haijapatikana.')
      if (!statusResponse.ok || !statusData.ok) throw new Error(statusData.error || 'WhatsApp status haijapatikana.')
      setBalance(Number(balanceData.balance || 0))
      setHistory(historyData.history || [])
      setConfigured(Boolean(statusData.configured))
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => { loadData() }, [loadData])

  const send = async (event) => {
    event.preventDefault()
    setStatus('')
    const recipients = recipientsText.split(/[\n,;]+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split('|')
      return { name: (parts[0] || '').trim(), phone: (parts.length > 1 ? parts[1] : parts[0]).trim() }
    })
    if (!recipients.length) return setStatus('Weka angalau namba moja. Mfano: Juma | 255712345678')
    if (!message.trim()) return setStatus('Andika ujumbe kwanza.')
    if (recipients.length > balance) return setStatus(`WhatsApp credits hazitoshi. Una ${balance}, unahitaji ${recipients.length}.`)
    if (!configured) return setStatus('WhatsApp Cloud API haijaunganishwa kikamilifu kwenye Render.')
    if (!window.confirm(`Unakaribia kutuma ujumbe kwa watu ${recipients.length}. Gharama: ${recipients.length} WhatsApp credits. Endelea?`)) return

    setSending(true)
    try {
      const response = await fetch(`${API}/api/whatsapp/send`, {
        method: 'POST', headers, body: JSON.stringify({ recipients, message: message.trim() }),
      })
      const data = await response.json()
      if (!response.ok && !data.results) throw new Error(data.error || 'WhatsApp haikutumwa.')
      setBalance(Number(data.balance ?? balance))
      setStatus(`${data.message || 'Ombi limekamilika.'} Imetumwa: ${data.sent || 0}; imeshindwa: ${data.failed || 0}. Salio: ${data.balance ?? balance}.`)
      if (data.results?.some((item) => item.error?.includes('hali ya ujumbe haijathibitishwa'))) {
        setStatus((previous) => previous + ' Kuna ujumbe ambao hali yake haijathibitishwa; usitume tena kabla ya kukagua WhatsApp Manager.')
      }
      setRecipientsText('')
      setMessage('')
      await loadData()
    } catch (error) {
      setStatus(error.message + ' Ikiwa tatizo ni la mtandao, kagua WhatsApp Manager kabla ya kurudia kutuma ili kuepuka ujumbe kurudiwa.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>WhatsApp</h1>
          <p>Tuma ujumbe kwa wageni kupitia namba rasmi ya ForteEvents.</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <h3>WhatsApp Balance</h3>
          <p className="big-number">{loading ? '...' : balance}</p>
          <p>Credit 1 kwa kila mpokeaji mmoja. Salio hili ni tofauti na SMS.</p>
        </div>
        <div className="card">
          <h3>Muunganisho</h3>
          <p>{loading ? 'Inakagua...' : configured ? 'WhatsApp Cloud API credentials zimeonekana.' : 'Credentials za WhatsApp hazijakamilika kwenye Render.'}</p>
          <button type="button" className="secondary-button" onClick={loadData}>Refresh</button>
        </div>
      </div>
      <div className="card">
        <h3>Tuma WhatsApp</h3>
        <form onSubmit={send}>
          <label>Wapokeaji (jina | namba), mmoja kwa kila mstari</label>
          <textarea rows="6" value={recipientsText} onChange={(event) => setRecipientsText(event.target.value)} placeholder={'Juma | 255712345678\nAsha | 255713456789'} />
          <label>Ujumbe</label>
          <textarea rows="5" maxLength={4096} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Andika ujumbe wako hapa..." />
          <p>{message.length}/4096 herufi · {recipientsText.split(/[\n,;]+/).filter((line) => line.trim()).length} wapokeaji · credit 1 kwa kila mpokeaji</p>
          <button className="primary-button" type="submit" disabled={sending || loading || !configured}>{sending ? 'Inatuma...' : 'Tuma WhatsApp'}</button>
        </form>
        {status && <p role="status" style={{ marginTop: 12, color: '#8a6d1d', fontWeight: 600 }}>{status}</p>}
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3>WhatsApp History</h3>
          <button type="button" className="secondary-button" onClick={loadData}>Refresh</button>
        </div>
        {history.length === 0 ? <p>Hakuna historia ya WhatsApp bado.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr><th style={{ padding: 8 }}>Tarehe</th><th style={{ padding: 8 }}>Mpokeaji</th><th style={{ padding: 8 }}>Ujumbe</th><th style={{ padding: 8 }}>Hali</th></tr></thead>
              <tbody>{history.map((item) => <tr key={item.id} style={{ borderTop: '1px solid #ddd' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{item.recipient}</td>
                <td style={{ padding: 8, maxWidth: 260, overflowWrap: 'anywhere' }}>{item.message}</td>
                <td style={{ padding: 8 }}>{item.status === 'sent' ? 'Imetumwa' : item.status === 'pending' ? 'Inasubiri' : 'Imeshindwa'}{item.error_message ? <div style={{ fontSize: 12 }}>{item.error_message}</div> : null}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
