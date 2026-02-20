import { useState, useEffect } from 'react';

interface Pix3lConfig {
  pix3lwikiUrl: string;
}

const DEFAULT_CONFIG: Pix3lConfig = {
  pix3lwikiUrl: 'http://localhost:3001',
};

export function usePix3lConfig(): Pix3lConfig {
  const [config, setConfig] = useState<Pix3lConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const windowConfig = (window as any).__PIX3L_CONFIG__;
    if (windowConfig?.pix3lwikiUrl) {
      setConfig({ pix3lwikiUrl: windowConfig.pix3lwikiUrl });
    }
  }, []);

  return config;
}
