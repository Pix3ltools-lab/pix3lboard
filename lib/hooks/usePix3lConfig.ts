import { useState, useEffect } from 'react';

interface Pix3lConfig {
  pix3lwikiUrl: string;
  pix3lnoteUrl: string;
}

const DEFAULT_CONFIG: Pix3lConfig = {
  pix3lwikiUrl: 'http://localhost:3001',
  pix3lnoteUrl: 'https://note.pix3ltools.com',
};

export function usePix3lConfig(): Pix3lConfig {
  const [config, setConfig] = useState<Pix3lConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const windowConfig = (window as any).__PIX3L_CONFIG__;
    if (windowConfig) {
      setConfig({
        pix3lwikiUrl: windowConfig.pix3lwikiUrl ?? DEFAULT_CONFIG.pix3lwikiUrl,
        pix3lnoteUrl: windowConfig.pix3lnoteUrl ?? DEFAULT_CONFIG.pix3lnoteUrl,
      });
    }
  }, []);

  return config;
}
