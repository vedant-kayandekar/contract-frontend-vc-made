const API_BASE = "http://localhost:8080/api";

function getHeaders(isMultipart = false) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Registration failed");
    }
    return res.json();
  },

  // Contracts
  async getContracts(search = "", status = "") {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "ALL") params.append("status", status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    
    const res = await fetch(`${API_BASE}/contracts${qs}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch contracts");
    return res.json();
  },

  async getContract(id) {
    const res = await fetch(`${API_BASE}/contracts/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load contract details");
    return res.json();
  },

  async uploadContract(formData) {
    const res = await fetch(`${API_BASE}/contracts/upload`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }
    return res.json();
  },

  async updateStatus(id, newStatus) {
    const res = await fetch(`${API_BASE}/contracts/${id}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Status update failed");
    }
    return res.json();
  },

  async downloadContract(id, filename) {
    const res = await fetch(`${API_BASE}/contracts/${id}/download`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `contract_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Q&A & Search
  async askContract(id, question) {
    const res = await fetch(`${API_BASE}/contracts/${id}/ask`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get AI answer");
    }
    return res.json();
  },

  async getChatHistory(id) {
    const res = await fetch(`${API_BASE}/contracts/${id}/chat-history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch chat history");
    return res.json();
  },

  async searchContract(id, keyword) {
    const res = await fetch(`${API_BASE}/contracts/${id}/search?keyword=${encodeURIComponent(keyword)}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },

  async askGlobal(question) {
    const res = await fetch(`${API_BASE}/contracts/global/ask`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Global inquiry failed");
    }
    return res.json();
  },

  async getGlobalChatHistory() {
    const res = await fetch(`${API_BASE}/contracts/global/chat-history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch global chat history");
    return res.json();
  },
};
