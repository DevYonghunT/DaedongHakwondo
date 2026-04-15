"use client";

import { useState, useEffect, useCallback } from "react";

/** 즐겨찾기 항목 */
export interface FavoriteItem {
  id: string;
  type: "academy" | "school";
  name: string;
  subtitle?: string;
  addedAt: number;
}

const STORAGE_KEY = "daedong-favorites-v1";

/** localStorage 기반 즐겨찾기 hook (학교/학원 모두 지원) */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 초기 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch (err) {
      console.warn("favorites load 실패", err);
    }
    setHydrated(true);
  }, []);

  // 변경 시 영속화
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (err) {
      console.warn("favorites save 실패", err);
    }
  }, [favorites, hydrated]);

  const isFavorite = useCallback(
    (id: string, type: FavoriteItem["type"]) =>
      favorites.some((f) => f.id === id && f.type === type),
    [favorites],
  );

  const toggle = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id && f.type === item.type);
      if (exists) {
        return prev.filter((f) => !(f.id === item.id && f.type === item.type));
      }
      return [{ ...item, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const remove = useCallback((id: string, type: FavoriteItem["type"]) => {
    setFavorites((prev) => prev.filter((f) => !(f.id === id && f.type === type)));
  }, []);

  return { favorites, hydrated, isFavorite, toggle, remove };
}
