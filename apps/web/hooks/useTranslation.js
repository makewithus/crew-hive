"use client";

import { useLanguage } from "@/lib/i18n";

export function useTranslation() {
  return useLanguage();
}

export default useTranslation;
