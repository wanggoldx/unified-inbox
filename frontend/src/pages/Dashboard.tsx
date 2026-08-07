import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import api from "../lib/api";
import Sidebar from "../components/Sidebar";

interface Email {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  bodyPreview: string;
  receivedAt: string;
  isRead: boolean;
  account: {
    provider: string;
    providerEmail: string;
  };
}

type ProviderFilter = "all" | "gmail" | "outlook";

export default function Dashboard() {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [listWidth, setListWidth] = useState(380);
  const [isDragging, setIsDragging] = useState(false);
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const sidebarWidth = 256;
      const minWidth = 280;
      const maxWidth = window.innerWidth * 0.6;
      const newWidth = e.clientX - sidebarWidth;
      setListWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ["emails", selectedAccount, page, providerFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (selectedAccount) params.set("account", selectedAccount);
      if (providerFilter !== "all") params.set("provider", providerFilter);
      return api.get(`/emails?${params}`).then((res) => res.data);
    },
  });

  const { data: selectedEmail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () =>
      api.get(`/emails/${selectedEmailId}`).then((res) => res.data.email),
    enabled: !!selectedEmailId,
  });

  const markReadMutation = useMutation({
    mutationFn: (emailId: string) => api.put(`/emails/${emailId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      if (selectedEmailId) {
        queryClient.invalidateQueries({ queryKey: ["email", selectedEmailId] });
      }
    },
  });

  const autoReadRef = useRef(new Set<string>());

  useEffect(() => {
    if (
      selectedEmail &&
      !selectedEmail.isRead &&
      !autoReadRef.current.has(selectedEmail.id)
    ) {
      autoReadRef.current.add(selectedEmail.id);
      markReadMutation.mutate(selectedEmail.id);
    }
  }, [selectedEmail]);

  const toggleReadMutation = useMutation({
    mutationFn: (emailId: string) =>
      api.put(`/emails/${emailId}/read`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      if (selectedEmailId) {
        queryClient.invalidateQueries({ queryKey: ["email", selectedEmailId] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (emailId: string) => api.delete(`/emails/${emailId}`),
    onSuccess: () => {
      setSelectedEmailId(null);
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (emailId: string) => api.post(`/emails/${emailId}/archive`),
    onSuccess: () => {
      setSelectedEmailId(null);
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post("/sync").then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const emails: Email[] = emailsData?.emails || [];
  const pagination = emailsData?.pagination;
  const unreadCount = emails.filter((e) => !e.isRead).length;

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        selectedAccount={selectedAccount}
        onAccountSelect={(account) => {
          setSelectedAccount(account);
          setPage(1);
          setSelectedEmailId(null);
        }}
      />

      <div
        style={{ width: listWidth, minWidth: 280 }}
        className="flex flex-col border-r border-gray-200"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {selectedAccount ? "Filtered Inbox" : "All Inboxes"}
            </h2>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
          {(["all", "gmail", "outlook"] as ProviderFilter[]).map(
            (provider) => (
              <button
                key={provider}
                onClick={() => {
                  setProviderFilter(provider);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs rounded-full capitalize ${
                  providerFilter === provider
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {provider === "all" ? "All" : provider}
              </button>
            )
          )}
          <div className="ml-auto">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              <svg
                className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {syncMutation.isPending ? "Syncing..." : "Sync"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              Loading emails...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No emails found. Connect a Gmail account to get started.
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmailId(email.id)}
                className={`flex flex-col px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedEmailId === email.id ? "bg-blue-50" : ""
                } ${!email.isRead ? "bg-blue-50/50" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {!email.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                    <span
                      className={`text-sm ${
                        !email.isRead ? "font-semibold" : ""
                      }`}
                    >
                      {email.sender}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(email.receivedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span
                    className={`text-sm ${
                      !email.isRead ? "font-medium" : ""
                    }`}
                  >
                    {email.subject}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      email.account.provider === "gmail"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {email.account.provider === "gmail" ? "Gmail" : "Outlook"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-4 truncate">
                  {email.bodyPreview}
                </p>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} emails)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        onMouseDown={() => setIsDragging(true)}
        className={`w-1 flex-shrink-0 cursor-col-resize transition-colors ${
          isDragging ? "bg-blue-400" : "bg-gray-200 hover:bg-blue-300"
        }`}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {selectedEmail ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSelectedEmailId(null)}
                  className="md:hidden text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </div>
              <h3 className="font-semibold text-lg">{selectedEmail.subject}</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                  {selectedEmail.sender.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{selectedEmail.sender}</p>
                  <p className="text-xs text-gray-500">
                    {selectedEmail.senderEmail}
                  </p>
                </div>
                <div className="ml-auto text-xs text-gray-400">
                  {new Date(selectedEmail.receivedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    selectedEmail.account.provider === "gmail"
                      ? "bg-red-50 text-red-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {selectedEmail.account.provider === "gmail"
                    ? "Gmail"
                    : "Outlook"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
              <button
                onClick={() => toggleReadMutation.mutate(selectedEmail.id)}
                className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
              >
                {selectedEmail.isRead ? "Mark Unread" : "Mark Read"}
              </button>
              {selectedEmail.account.provider === "gmail" && (
                <button
                  onClick={() => archiveMutation.mutate(selectedEmail.id)}
                  disabled={archiveMutation.isPending}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Archive
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Delete this email?")) {
                    deleteMutation.mutate(selectedEmail.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedEmail.bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {selectedEmail.bodyText}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select an email to view
          </div>
        )}
      </div>
    </div>
  );
}
