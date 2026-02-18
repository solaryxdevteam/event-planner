"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import * as usersClientService from "@/lib/services/client/users.client.service";

type UserOption = usersClientService.PotentialParentOption;

interface UserSearchComboboxProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  role: string;
  excludeUserId?: string;
  placeholder?: string;
  label?: string;
  error?: string;
}

function formatOptionLabel(option: UserOption): string {
  const name = option.last_name ? `${option.first_name} ${option.last_name}` : option.first_name;
  return `${name} (${option.email}) - ${option.role.replace(/_/g, " ")}`;
}

export function UserSearchCombobox({
  value,
  onValueChange,
  role,
  excludeUserId,
  placeholder = "Search by name or email...",
  label,
  error,
}: UserSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<UserOption[]>([]);
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<UserOption | null>(null);
  const [loadingSelected, setLoadingSelected] = React.useState(false);
  const limit = 20;

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load selected user for display when value is set
  React.useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    const found = options.find((o) => o.id === value);
    if (found) {
      setSelectedOption(found);
      return;
    }
    setLoadingSelected(true);
    usersClientService
      .fetchUserMinimal(value)
      .then((user) => setSelectedOption(user || null))
      .finally(() => setLoadingSelected(false));
  }, [value, options]);

  // Fetch options when popover opens or debounced query / page changes
  const fetchPage = React.useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const result = await usersClientService.fetchPotentialParentsPaginated(role, {
          query: debouncedQuery || undefined,
          page: pageNum,
          limit,
          excludeUserId,
        });
        if (append) {
          setOptions((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const newOnes = result.data.filter((u) => !ids.has(u.id));
            return [...prev, ...newOnes];
          });
        } else {
          setOptions(result.data);
        }
        setTotal(result.pagination.total);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [role, debouncedQuery, excludeUserId]
  );

  // When popover opens or search query changes, fetch first page
  React.useEffect(() => {
    if (!open) return;
    setPage(1);
    fetchPage(1, false);
  }, [open, debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset search when popover closes so next open starts fresh
  React.useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedQuery("");
    }
  }, [open]);

  const loadMore = React.useCallback(() => {
    const nextPage = page + 1;
    if (options.length >= total || loadingMore) return;
    setPage(nextPage);
    fetchPage(nextPage, true);
  }, [page, options.length, total, loadingMore, fetchPage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) loadMore();
  };

  const displayText = selectedOption ? formatOptionLabel(selectedOption) : value ? "Loading..." : null;

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loadingSelected}
          >
            {loadingSelected && value ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : displayText ? (
              <span className="truncate">{displayText}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 rounded-b-none border-0 border-b"
            />
            <CommandList className="max-h-[300px] p-0">
              <div className="max-h-[280px] overflow-y-auto" onScroll={handleScroll}>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : options.length === 0 ? (
                  <CommandEmpty>No users found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {options.map((option) => {
                      const optionText = formatOptionLabel(option);
                      return (
                        <CommandItem
                          key={option.id}
                          value={option.id}
                          onSelect={() => {
                            onValueChange(value === option.id ? null : option.id);
                            setOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="truncate">{optionText}</span>
                            <span className="text-sm text-muted-foreground">{option.role.replace(/_/g, " ")}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                    {loadingMore && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </CommandGroup>
                )}
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
