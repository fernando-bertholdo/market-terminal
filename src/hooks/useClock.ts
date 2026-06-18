'use client';

import { useState, useEffect } from 'react';

interface ClockState {
  brt: string; // Brazil Time (America/Sao_Paulo)
  et: string;  // Eastern Time (America/New_York)
}

const brtFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatClock(formatter: Intl.DateTimeFormat, date: Date): string {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const h = get('hour').padStart(2, '0');
  const m = get('minute').padStart(2, '0');
  const s = get('second').padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function useClock(): ClockState {
  const [state, setState] = useState<ClockState>({
    brt: "--:--:--",
    et: "--:--:--",
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setState({
        brt: formatClock(brtFormatter, now),
        et: formatClock(etFormatter, now),
      });
    };

    update();
    const id = setInterval(update, 1000);

    return () => clearInterval(id);
  }, []);

  return state;
}
