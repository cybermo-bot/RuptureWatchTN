'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// The first-visit guide is shown once per browser (pilot-2 item 2): when it opens by itself
// (`first`), a browser that has already seen it goes straight to « Mes médicaments ». Just after
// joining it always shows, with the « Gardez ce navigateur » line. Kept on this device only.
const SEEN = 'rw-guide-seen';

export function GuideSeen({ first, joined }: { first: boolean; joined: boolean }) {
  const router = useRouter();
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN) === '1';
      localStorage.setItem(SEEN, '1');
    } catch {
      // Storage blocked: the guide simply shows.
    }
    if (first && seen && !joined) router.replace('/pharmacie');
  }, [first, joined, router]);
  return null;
}
