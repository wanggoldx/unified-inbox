import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

interface EmailAccount {
  id: string;
  provider: string;
  providerEmail: string;
}

interface SidebarProps {
  onAccountSelect: (accountId: string | null) => void;
  selectedAccount: string | null;
}

export default function Sidebar({
  onAccountSelect,
  selectedAccount,
}: SidebarProps) {
  const queryClient = useQueryClient();

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get("/accounts").then((res) => res.data.accounts),
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await api.get(`/accounts/${provider}`);
      return res.data.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "width=600,height=700");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => api.delete(`/accounts/${accountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const accounts: EmailAccount[] = accountsData || [];

  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Unified Inbox</h1>
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={() => onAccountSelect(null)}
          className={`w-full text-left px-3 py-2 rounded text-sm ${
            selectedAccount === null
              ? "bg-blue-600"
              : "hover:bg-gray-800"
          }`}
        >
          All Inboxes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Accounts
        </h2>

        {isLoading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="text-gray-500 text-sm">No accounts connected</div>
        ) : (
          <div className="space-y-1">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer group ${
                  selectedAccount === account.id
                    ? "bg-blue-600"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => onAccountSelect(account.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">
                    {account.provider === "gmail" ? "📧" : "📨"}
                  </span>
                  <span className="text-sm truncate">
                    {account.providerEmail}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm("Disconnect this account?")
                    ) {
                      disconnectMutation.mutate(account.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={() => connectMutation.mutate("gmail")}
          disabled={connectMutation.isPending}
          className="w-full py-2 px-3 bg-white text-gray-900 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {connectMutation.isPending ? "Connecting..." : "Connect Gmail"}
        </button>
        <button
          onClick={() => connectMutation.mutate("outlook")}
          disabled={connectMutation.isPending}
          className="w-full py-2 px-3 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {connectMutation.isPending ? "Connecting..." : "Connect Outlook"}
        </button>
      </div>
    </div>
  );
}
