import { useState, useEffect } from 'react';

function getAuthUrl(src: string): Promise<string> {
  const token = localStorage.getItem('token');
  return fetch(src, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to load');
      return res.blob();
    })
    .then(blob => URL.createObjectURL(blob));
}

export function AuthImage({
  src,
  alt = '',
  className = '',
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke = '';
    if (src) {
      getAuthUrl(src).then(url => {
        setBlobUrl(url);
        revoke = url;
      }).catch(() => setBlobUrl(null));
    }
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [src]);

  if (!blobUrl) return null;
  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />;
}

export function useAuthUrl(src: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke = '';
    if (src) {
      getAuthUrl(src).then(u => {
        setUrl(u);
        revoke = u;
      }).catch(() => setUrl(null));
    } else {
      setUrl(null);
    }
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [src]);

  return url;
}
