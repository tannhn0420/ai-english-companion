import { useCallback, useEffect, useState } from 'react';
import type { VocabCard } from '../core/types';
import { mergeImport } from '../core/importExport';
import * as db from '../services/db';

/** Deck từ IndexedDB + các thao tác ghi (ghi DB trước, cập nhật state sau). */
export function useDeck() {
  const [deck, setDeck] = useState<VocabCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    db.getAllCards()
      .then((cards) => {
        if (alive) setDeck(cards.sort((a, b) => b.createdAt - a.createdAt));
      })
      .catch(() => {
        /* DB hỏng — deck rỗng, UI hiện empty state */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const upsert = useCallback(async (card: VocabCard) => {
    await db.putCard(card);
    setDeck((prev) => {
      const i = prev.findIndex((c) => c.id === card.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = card;
        return next;
      }
      return [card, ...prev];
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    await db.deleteCard(id);
    setDeck((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const importCards = useCallback(
    async (incoming: VocabCard[]) => {
      const { toAdd, added, skipped } = mergeImport(deck, incoming);
      if (toAdd.length) await db.putCards(toAdd);
      setDeck((prev) => [...toAdd, ...prev]);
      return { added, skipped };
    },
    [deck],
  );

  const clearAll = useCallback(async () => {
    await db.clearCards();
    setDeck([]);
  }, []);

  return { deck, loading, upsert, remove, importCards, clearAll };
}
