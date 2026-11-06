import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Button, Card, DemoBanner, Skeleton } from '../components/ui';

export default function ReceivePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/payments/receive')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const copyId = async () => {
    await navigator.clipboard.writeText(data.demoUpiId);
    toast.success('Demo UPI ID copied');
  };

  const share = async () => {
    const text = `Pay me on PayFlow UPI (demo): ${data.demoUpiId}\n${data.payUri}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PayFlow UPI Demo', text });
        return;
      } catch {
        /* fallback */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success('Share text copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-primary">Receive (demo)</h1>
      <DemoBanner compact />
      {loading ? (
        <Skeleton className="mx-auto h-56 w-56" />
      ) : (
        <Card className="flex flex-col items-center py-6">
          <QRCodeSVG value={data.payUri} size={200} level="M" includeMargin />
          <p className="mt-4 break-all text-center text-sm font-medium">{data.demoUpiId}</p>
          <p className="mt-2 px-4 text-center text-xs text-slate-500">{data.disclaimer}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={copyId}>
              <Copy className="h-4 w-4" /> Copy ID
            </Button>
            <Button variant="secondary" onClick={share}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
