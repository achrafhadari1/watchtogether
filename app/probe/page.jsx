'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MonitorPlay, Link as LinkIcon, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ProbePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [detectedUrls, setDetectedUrls] = useState([]);
  const [probeWindow, setProbeWindow] = useState(null);

  useEffect(() => {
    const url = searchParams.get('url');
    if (url) {
      try {
        setTargetUrl(decodeURIComponent(url));
      } catch (error) {
        console.error('Failed to decode URL:', error);
        toast.error('Invalid URL provided');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'MEDIA_DETECTED') {
        const newUrl = event.data.url;
        if (isHighPriorityVideoUrl(newUrl)) {
          // Automatically use high-priority video URLs (like m3u8)
          useDetectedUrl(newUrl);
          if (probeWindow) {
            probeWindow.close();
          }
        } else {
          setDetectedUrls(prev => {
            if (!prev.includes(newUrl)) {
              return [...prev, newUrl];
            }
            return prev;
          });
          toast.success('New media URL detected!');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (probeWindow && !probeWindow.closed) {
        probeWindow.close();
      }
    };
  }, [probeWindow]);

  const isHighPriorityVideoUrl = (url) => {
    // Prioritize HLS and direct video streams
    return /\.(m3u8|mp4)($|\?)/i.test(url) || 
           /(playlist\.m3u8|master\.m3u8)/i.test(url);
  };

  const isDirectVideoUrl = (url) => {
    const videoExtensions = /\.(mp4|webm|ogg|m3u8)($|\?)/i;
    const streamingPatterns = /(playlist\.m3u8|manifest\.mpd|\.ts\?|master\.m3u8)/i;
    return videoExtensions.test(url) || streamingPatterns.test(url);
  };

  const openProbeWindow = () => {
    const width = Math.min(1024, window.screen.width * 0.8);
    const height = Math.min(768, window.screen.height * 0.8);
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const newWindow = window.open(
      targetUrl,
      'VideoProbe',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (newWindow) {
      setProbeWindow(newWindow);

      newWindow.onload = () => {
        try {
          const script = `
            const mediaUrls = new Set();
            const mediaExtensions = /\\.(m3u8|mp4|webm|ogg|ts)($|\\?)/i;
            const mediaTypes = /(video|application\\/x-mpegURL|application\\/vnd\\.apple\\.mpegurl|application\\/dash\\+xml)/i;
            const streamingPatterns = /(playlist\\.m3u8|manifest\\.mpd|\\.ts\\?|master\\.m3u8)/i;

            // Monitor video elements
            const observeVideo = () => {
              const videos = document.getElementsByTagName('video');
              Array.from(videos).forEach(video => {
                const checkAndSendUrl = (url) => {
                  if (url && !mediaUrls.has(url)) {
                    mediaUrls.add(url);
                    window.opener.postMessage({ type: 'MEDIA_DETECTED', url }, '*');
                  }
                };

                checkAndSendUrl(video.src);
                Array.from(video.getElementsByTagName('source')).forEach(source => {
                  checkAndSendUrl(source.src);
                });
              });
            };

            // Observe DOM changes
            new MutationObserver(observeVideo).observe(document.documentElement, {
              childList: true,
              subtree: true
            });

            // Monitor network requests
            const originalFetch = window.fetch;
            window.fetch = async function(resource, init) {
              const response = await originalFetch.apply(this, arguments);
              const url = typeof resource === 'string' ? resource : resource.url;
              
              if (url && (mediaExtensions.test(url) || streamingPatterns.test(url))) {
                if (!mediaUrls.has(url)) {
                  mediaUrls.add(url);
                  window.opener.postMessage({ type: 'MEDIA_DETECTED', url }, '*');
                }
              }
              
              return response;
            };

            // Monitor XHR requests
            const XHR = XMLHttpRequest.prototype;
            const open = XHR.open;
            const send = XHR.send;

            XHR.open = function(method, url) {
              this._url = url;
              return open.apply(this, arguments);
            };

            XHR.send = function() {
              this.addEventListener('load', function() {
                const url = this._url;
                const contentType = this.getResponseHeader('Content-Type');
                
                if (
                  (url && (mediaExtensions.test(url) || streamingPatterns.test(url))) ||
                  (contentType && mediaTypes.test(contentType))
                ) {
                  if (!mediaUrls.has(url)) {
                    mediaUrls.add(url);
                    window.opener.postMessage({ type: 'MEDIA_DETECTED', url }, '*');
                  }
                }
              });
              return send.apply(this, arguments);
            };

            // Initial video check
            observeVideo();
          `;

          const scriptElement = newWindow.document.createElement('script');
          scriptElement.textContent = script;
          newWindow.document.head.appendChild(scriptElement);
        } catch (error) {
          console.error('Failed to inject script:', error);
          toast.error('Failed to initialize video detection');
        }
      };
    } else {
      toast.error('Popup was blocked. Please allow popups for this site.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    const roomId = searchParams.get('roomId');
    const encodedUrl = encodeURIComponent(manualUrl);
    router.push(`/room/${roomId}?videoUrl=${encodedUrl}`);
  };

  const useDetectedUrl = (url) => {
    const roomId = searchParams.get('roomId');
    const encodedUrl = encodeURIComponent(url);
    router.push(`/room/${roomId}?videoUrl=${encodedUrl}`);
  };

  const goBack = () => {
    const roomId = searchParams.get('roomId');
    router.push(`/room/${roomId}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <MonitorPlay className="h-6 w-6 text-primary mr-2" />
              <CardTitle>Video Link Detection</CardTitle>
            </div>
          </div>
          <CardDescription>
            We'll help you detect the video source. Click the button below to open the site in a new window.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={openProbeWindow}
              className="gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              Open Video Site
            </Button>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground text-center">
            <p>👉 Click play on the video in the new window.</p>
            <p>We'll automatically detect and use the video URL when found.</p>
          </div>

          {detectedUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Detected Media URLs:</h3>
              <div className="space-y-2">
                {detectedUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card">
                    <div className="flex-1 truncate text-sm">
                      {url}
                    </div>
                    <Button size="sm" onClick={() => useDetectedUrl(url)}>
                      Use This URL
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Manual URL Input:</h3>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                type="url"
                placeholder="Enter direct video URL (e.g., .mp4, .m3u8)"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!manualUrl.trim()}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Use URL
              </Button>
            </form>
          </div>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          <p>Note: Make sure to allow popups in your browser for this site to work properly.</p>
        </CardFooter>
      </Card>
    </main>
  );
}