import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./App.css";
import { 
  FileText, Shield, UploadCloud, Search, MessageSquare, 
  Download, LogOut, CheckCircle, AlertCircle, Clock, 
  Send, Sparkles, Building, Calendar, DollarSign, X
} from "lucide-react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState("radhika@seventhraylegaltech.com");
  const [authPassword, setAuthPassword] = useState("Password123!");
  const [authName, setAuthName] = useState("Radhika Sharma");
  const [authCompany, setAuthCompany] = useState("Seventh Ray LegalTech Solutions");
  
  // Dashboard State
  const [contracts, setContracts] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadClient, setUploadClient] = useState("");
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadValue, setUploadValue] = useState("");
  const [uploadStart, setUploadStart] = useState("");
  const [uploadEnd, setUploadEnd] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  // Contract Details & AI Chat Drawer
  const [selectedContract, setSelectedContract] = useState(null);
  const [drawerTab, setDrawerTab] = useState("ai"); // 'ai' | 'search' | 'document'
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Keyword Search Inside Contract
  const [clauseKeyword, setClauseKeyword] = useState("");
  const [clauseSearchResults, setClauseSearchResults] = useState(null);

  // Global Portfolio Q&A State
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [globalQuestion, setGlobalQuestion] = useState("");
  const [globalResponse, setGlobalResponse] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadContracts();
    }
  }, [token, statusFilter]);

  async function loadContracts() {
    try {
      setLoading(true);
      const data = await api.getContracts(searchFilter, statusFilter);
      setContracts(data);
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  function showAlert(type, text) {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 6000);
  }

  // --- Auth Handlers ---
  async function handleAuth(e) {
    e.preventDefault();
    try {
      if (isRegister) {
        await api.register({
          name: authName,
          email: authEmail,
          password: authPassword,
          companyName: authCompany,
        });
        showAlert("success", "Account created successfully! Please log in.");
        setIsRegister(false);
      } else {
        const res = await api.login(authEmail, authPassword);
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res));
        setToken(res.token);
        setUser(res);
        showAlert("success", `Welcome back, ${res.name}!`);
      }
    } catch (err) {
      showAlert("error", err.message);
    }
  }

  function handleLogout() {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setContracts([]);
  }

  // --- Upload Contract Handler ---
  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) {
      showAlert("error", "Please select a contract document (PDF or DOCX)");
      return;
    }
    const formData = new FormData();
    formData.append("title", uploadTitle);
    formData.append("clientName", uploadClient);
    formData.append("contractType", uploadType);
    if (uploadValue) formData.append("value", uploadValue);
    if (uploadStart) formData.append("startDate", uploadStart);
    if (uploadEnd) formData.append("endDate", uploadEnd);
    formData.append("file", uploadFile);

    try {
      setLoading(true);
      await api.uploadContract(formData);
      showAlert("success", "Contract uploaded and parsed successfully!");
      setUploadOpen(false);
      resetUploadForm();
      loadContracts();
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetUploadForm() {
    setUploadTitle("");
    setUploadClient("");
    setUploadType("OTHER");
    setUploadValue("");
    setUploadStart("");
    setUploadEnd("");
    setUploadFile(null);
  }

  // --- State Machine Lifecycle Transition ---
  async function handleStatusChange(contractId, newStatus) {
    try {
      await api.updateStatus(contractId, newStatus);
      showAlert("success", `Status transitioned to ${newStatus}`);
      loadContracts();
      if (selectedContract && selectedContract.id === contractId) {
        openContractDrawer(contractId);
      }
    } catch (err) {
      showAlert("error", err.message);
    }
  }

  // --- Contract Drawer & AI Chat ---
  async function openContractDrawer(contractId) {
    try {
      const contract = await api.getContract(contractId);
      setSelectedContract(contract);
      setDrawerTab("ai");
      const history = await api.getChatHistory(contractId);
      setChatMessages(history);
      setClauseSearchResults(null);
      setClauseKeyword("");
    } catch (err) {
      showAlert("error", err.message);
    }
  }

  async function handleSendQuestion(e) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedContract) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "USER", message: question }]);

    try {
      setChatLoading(true);
      const res = await api.askContract(selectedContract.id, question);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ASSISTANT",
          message: res.answer,
          matchingClauses: res.matchingClauses,
          aiGenerated: res.aiGenerated,
        },
      ]);
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setChatLoading(false);
    }
  }

  // --- Keyword Chunk Search Inside Single Document ---
  async function handleKeywordSearch(e) {
    e.preventDefault();
    if (!clauseKeyword.trim() || !selectedContract) return;

    try {
      const res = await api.searchContract(selectedContract.id, clauseKeyword.trim());
      setClauseSearchResults(res);
    } catch (err) {
      showAlert("error", err.message);
    }
  }

  // --- Global Portfolio AI Inquiry ---
  async function handleGlobalInquiry(e) {
    e.preventDefault();
    if (!globalQuestion.trim()) return;

    try {
      setGlobalLoading(true);
      const res = await api.askGlobal(globalQuestion.trim());
      setGlobalResponse(res);
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setGlobalLoading(false);
    }
  }

  // --- Compute Metrics ---
  const countTotal = contracts.length;
  const countReview = contracts.filter((c) => c.status === "UNDER_REVIEW").length;
  const countApproved = contracts.filter((c) => c.status === "APPROVED").length;
  const countDraft = contracts.filter((c) => c.status === "DRAFT").length;

  // ==========================================
  // VIEW 1: AUTHENTICATION (Login / Register)
  // ==========================================
  if (!token) {
    return (
      <div className="modal-overlay">
        <div className="modal-card" style={{ maxWidth: 460 }}>
          <div className="modal-header">
            <div className="brand">
              <div className="brand-icon">CS</div>
              <div>
                <div className="brand-title">Contract Story</div>
                <div className="brand-sub">Seventh Ray LegalTech SaaS</div>
              </div>
            </div>
          </div>
          <form onSubmit={handleAuth}>
            <div className="modal-body">
              {alert && (
                <div style={{ padding: "0.75rem", borderRadius: 8, fontSize: "0.85rem", background: alert.type === "error" ? "#fee2e2" : "#dcfce7", color: alert.type === "error" ? "#991b1b" : "#166534" }}>
                  {alert.text}
                </div>
              )}

              {isRegister && (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input className="form-input" required value={authName} onChange={(e) => setAuthName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Company / Law Firm Name</label>
                    <input className="form-input" required value={authCompany} onChange={(e) => setAuthCompany(e.target.value)} />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <input className="form-input" type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input className="form-input" type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? "Existing user? Log In" : "Need account? Register"}
              </button>
              <button type="submit" className="btn btn-primary">
                {isRegister ? "Create Account" : "Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">CS</div>
          <div>
            <div className="brand-title">Contract Story</div>
            <div className="brand-sub">AI-Powered Contract Lifecycle Management</div>
          </div>
        </div>

        <div className="user-profile">
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-org">{user?.companyName}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content">
        {/* Alert Banner */}
        {alert && (
          <div style={{ padding: "0.85rem 1.25rem", borderRadius: 8, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: alert.type === "error" ? "#fee2e2" : "#dcfce7", color: alert.type === "error" ? "#991b1b" : "#166534" }}>
            {alert.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{alert.text}</span>
          </div>
        )}

        {/* Global Portfolio AI Search Banner */}
        <section className="global-qa-banner">
          <div className="banner-header">
            <div>
              <div className="banner-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={20} color="#60a5fa" /> Enterprise Portfolio Intelligence
              </div>
              <div className="banner-desc">
                Ask questions across all {countTotal} uploaded contracts simultaneously. The AI cross-references terms across every document.
              </div>
            </div>
          </div>

          <form className="global-input-box" onSubmit={(e) => { e.preventDefault(); setGlobalModalOpen(true); handleGlobalInquiry(e); }}>
            <input 
              placeholder="e.g. Which of our contracts have a 60-day termination notice? Or summarize confidentiality terms..." 
              value={globalQuestion} 
              onChange={(e) => setGlobalQuestion(e.target.value)} 
            />
            <button type="submit" className="btn btn-primary">
              <Search size={16} /> Ask AI
            </button>
          </form>
        </section>

        {/* Key Metrics */}
        <section className="metrics-grid">
          <div className="metric-card">
            <div>
              <div className="metric-value">{countTotal}</div>
              <div className="metric-label">Total Contracts</div>
            </div>
            <FileText size={32} color="#94a3b8" />
          </div>

          <div className="metric-card">
            <div>
              <div className="metric-value" style={{ color: "#ca8a04" }}>{countReview}</div>
              <div className="metric-label">Under Review</div>
            </div>
            <Clock size={32} color="#fde047" />
          </div>

          <div className="metric-card">
            <div>
              <div className="metric-value" style={{ color: "#16a34a" }}>{countApproved}</div>
              <div className="metric-label">Approved & Active</div>
            </div>
            <CheckCircle size={32} color="#86efac" />
          </div>

          <div className="metric-card">
            <div>
              <div className="metric-value" style={{ color: "#475569" }}>{countDraft}</div>
              <div className="metric-label">Drafts</div>
            </div>
            <Shield size={32} color="#cbd5e1" />
          </div>
        </section>

        {/* Action & Filter Controls */}
        <section className="controls-bar">
          <div className="filter-group">
            <input
              className="search-input"
              placeholder="Filter by title, client, or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadContracts()}
            />
            <select className="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className="btn btn-secondary" onClick={loadContracts}>
              <Search size={16} /> Filter
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
            <UploadCloud size={18} /> Upload Contract
          </button>
        </section>

        {/* Contracts Table */}
        <section className="contracts-table-card">
          <table>
            <thead>
              <tr>
                <th>Contract & Counterparty</th>
                <th>Type</th>
                <th>Value</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Lifecycle Action</th>
                <th>Operations</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                    No contracts found. Click "Upload Contract" above to add your first agreement.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="contract-title-cell">{c.title}</div>
                      <div className="contract-client-cell">{c.clientName}</div>
                    </td>
                    <td><span className="badge badge-DRAFT">{c.contractType}</span></td>
                    <td>{c.value ? `$${Number(c.value).toLocaleString()}` : "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {c.startDate ? `${c.startDate} to ${c.endDate || "Ongoing"}` : "Not specified"}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {/* State Machine Transition Buttons */}
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {c.status === "DRAFT" && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(c.id, "UNDER_REVIEW")}>
                            Submit for Review
                          </button>
                        )}
                        {c.status === "UNDER_REVIEW" && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(c.id, "APPROVED")}>
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(c.id, "REJECTED")}>
                              Reject
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(c.id, "DRAFT")}>
                              Return
                            </button>
                          </>
                        )}
                        {c.status === "APPROVED" && (
                          <>
                            <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(c.id, "REJECTED")}>
                              Dispute
                            </button>
                            <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(c.id, "UNDER_REVIEW")}>
                              Re-review
                            </button>
                          </>
                        )}
                        {c.status === "REJECTED" && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(c.id, "DRAFT")}>
                              Revise
                            </button>
                            <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(c.id, "UNDER_REVIEW")}>
                              Resubmit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openContractDrawer(c.id)}>
                          <MessageSquare size={14} /> View & AI Chat
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => api.downloadContract(c.id, c.fileName)} title="Download File">
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {/* ==========================================
          MODAL: Upload New Contract
      ========================================== */}
      {uploadOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Upload & Parse New Contract</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setUploadOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Contract Title *</label>
                  <input className="form-input" required placeholder="e.g. Master Services Agreement" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Counterparty / Client Name *</label>
                  <input className="form-input" required placeholder="e.g. Acme Corporation" value={uploadClient} onChange={(e) => setUploadClient(e.target.value)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Contract Type</label>
                    <select className="form-select" value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                      <option value="NDA">NDA (Non-Disclosure)</option>
                      <option value="MSA">MSA (Master Service)</option>
                      <option value="SLA">SLA (Service Level)</option>
                      <option value="SOW">SOW (Statement of Work)</option>
                      <option value="EPC">EPC (Engineering/Procurement)</option>
                      <option value="EMPLOYMENT">Employment Agreement</option>
                      <option value="VENDOR">Vendor Agreement</option>
                      <option value="OTHER">Other Agreement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contract Value ($)</label>
                    <input className="form-input" type="number" step="0.01" placeholder="e.g. 50000.00" value={uploadValue} onChange={(e) => setUploadValue(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input className="form-input" type="date" value={uploadStart} onChange={(e) => setUploadStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input className="form-input" type="date" value={uploadEnd} onChange={(e) => setUploadEnd(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Document (PDF, Word .docx, or .txt) *</label>
                  <input className="form-input" type="file" required accept=".pdf,.docx,.doc,.txt" onChange={(e) => setUploadFile(e.target.files[0])} />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Parsed instantly using Apache PDFBox & Apache POI</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUploadOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Parsing & Uploading..." : "Upload Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          DRAWER: Contract Details & AI Chat
      ========================================== */}
      {selectedContract && (
        <div className="drawer-overlay" onClick={() => setSelectedContract(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedContract.title}</h3>
                  <span className={`badge badge-${selectedContract.status}`}>{selectedContract.status}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Counterparty: {selectedContract.clientName} | File: {selectedContract.fileName}
                </div>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setSelectedContract(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="drawer-tabs">
              <div className={`drawer-tab ${drawerTab === "ai" ? "active" : ""}`} onClick={() => setDrawerTab("ai")}>
                <Sparkles size={14} style={{ display: "inline", marginRight: 4 }} /> AI Legal Assistant
              </div>
              <div className={`drawer-tab ${drawerTab === "search" ? "active" : ""}`} onClick={() => setDrawerTab("search")}>
                <Search size={14} style={{ display: "inline", marginRight: 4 }} /> Keyword Chunks
              </div>
              <div className={`drawer-tab ${drawerTab === "document" ? "active" : ""}`} onClick={() => setDrawerTab("document")}>
                <FileText size={14} style={{ display: "inline", marginRight: 4 }} /> Parsed Document Text
              </div>
            </div>

            {/* TAB 1: AI Legal Assistant Chat */}
            {drawerTab === "ai" && (
              <>
                <div className="chat-history">
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
                      <Sparkles size={36} color="#94a3b8" style={{ marginBottom: "0.5rem" }} />
                      <p>Ask anything about this contract!</p>
                      <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        Try: "What are the payment terms?" or "How can either party terminate?"
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.role.toLowerCase()}`}>
                        <div style={{ fontWeight: 600, fontSize: "0.75rem", marginBottom: "0.25rem", color: msg.role === "USER" ? "#bfdbfe" : "#475569" }}>
                          {msg.role === "USER" ? "You" : (msg.aiGenerated ? "AI Legal Counsel" : "Heuristic Search")}
                        </div>
                        <div style={{ whiteSpace: "pre-line" }}>{msg.message}</div>
                        {msg.matchingClauses && msg.matchingClauses.length > 0 && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase" }}>Cited Clauses:</div>
                            {msg.matchingClauses.map((clause, idx) => (
                              <div key={idx} className="clause-tag">{clause}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="chat-bubble assistant" style={{ fontStyle: "italic", color: "#64748b" }}>
                      AI is analyzing clauses and legal context...
                    </div>
                  )}
                </div>

                <form className="chat-input-row" onSubmit={handleSendQuestion}>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Ask a question about this contract..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={chatLoading}>
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}

            {/* TAB 2: Keyword Chunk Search */}
            {drawerTab === "search" && (
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1, overflowY: "auto" }}>
                <form onSubmit={handleKeywordSearch} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Search keyword (e.g. termination, confidentiality)..."
                    value={clauseKeyword}
                    onChange={(e) => setClauseKeyword(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">Search</button>
                </form>

                {clauseSearchResults && (
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "0.75rem" }}>
                      Found {clauseSearchResults.matchCount} matching clauses for "{clauseSearchResults.keyword}":
                    </div>
                    {clauseSearchResults.matchingSnippets.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No clauses found containing this term.</div>
                    ) : (
                      clauseSearchResults.matchingSnippets.map((snippet, i) => (
                        <div key={i} className="clause-tag" style={{ marginBottom: "0.75rem", whiteSpace: "pre-line" }}>
                          {snippet}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Full Parsed Document Text */}
            {drawerTab === "document" && (
              <div style={{ padding: "1.25rem", flex: 1, overflowY: "auto" }}>
                <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Parsed plain text extracted from uploaded document</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => api.downloadContract(selectedContract.id, selectedContract.fileName)}>
                    <Download size={14} /> Download Original Document
                  </button>
                </div>
                <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", whiteSpace: "pre-wrap", fontFamily: "monospace", lineHeight: 1.6 }}>
                  {selectedContract.parsedText || "No parsed text available."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: Global Portfolio AI Answer
      ========================================== */}
      {globalModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} color="#3b82f6" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Enterprise Portfolio Intelligence</h3>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setGlobalModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ background: "#f1f5f9", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                Query: "{globalQuestion}"
              </div>

              {globalLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                  AI is synthesizing provisions across all {countTotal} portfolio contracts...
                </div>
              ) : globalResponse ? (
                <div>
                  <div style={{ fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-line", margin: "1rem 0" }}>
                    {globalResponse.answer}
                  </div>
                  {globalResponse.matchingClauses && globalResponse.matchingClauses.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase" }}>Relevant Portfolio Provisions:</div>
                      {globalResponse.matchingClauses.map((clause, i) => (
                        <div key={i} className="clause-tag">{clause}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setGlobalModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
