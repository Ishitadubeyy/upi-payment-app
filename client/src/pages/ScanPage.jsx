import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../services/api';
import { Button, Card, Input } from '../components/ui';
import { formatInrFromPaise } from '../utils/format';

export default function ScanPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('choose');
  const [manual, setManual] = useState('');
  const [preview, setPreview] = useState(null);
  const [denied, setDenied] = useState(false);
  const scannerRef = useRef(null);
  const html5Ref = useRef(null);

  useEffect(() => {
    return () => {
      html5Ref.current?.stop().catch(() => {});
    };
  }, []);

  const handleParsed = async (payload) => {
    try {
      const { data } = await api.post('/users/parse-qr', { payload });
      setPreview(data);
      setMode('preview');
      html5Ref.current?.stop().catch(() => {});
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const startCamera = async () => {
    setMode('camera');
    setDenied(false);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      html5Ref.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          handleParsed(decoded);
        },
        () => {}
      );
    } catch {
      setDenied(true);
      setMode('manual');
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code) {
      toast.error('No QR code found in image');
      return;
    }
    handleParsed(code.data);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-primary">Scan QR (demo)</h1>
      <p className="text-sm text-slate-600">Camera opens only when you choose scan. Payments never auto-start.</p>

      {mode === 'choose' && (
        <div className="space-y-3">
          <Button className="w-full" onClick={startCamera}>
            Open camera scanner
          </Button>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Upload QR image</span>
            <input type="file" accept="image/*" onChange={onFile} className="text-sm" />
          </label>
          <Button variant="secondary" className="w-full" onClick={() => setMode('manual')}>
            Enter UPI ID manually
          </Button>
        </div>
      )}

      {mode === 'camera' && (
        <Card className="overflow-hidden p-0">
          <div id="qr-reader" ref={scannerRef} />
          {denied && <p className="p-3 text-sm text-red-600">Camera permission denied. Use manual entry or upload.</p>}
          <Button variant="ghost" className="w-full" onClick={() => setMode('manual')}>
            Use manual entry
          </Button>
        </Card>
      )}

      {mode === 'manual' && (
        <>
          <Input label="Demo UPI ID or payflow:// URI" value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button className="w-full" onClick={() => handleParsed(manual)}>
            Validate
          </Button>
        </>
      )}

      {mode === 'preview' && preview && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">Recipient found</p>
          <p>{preview.recipient.name}</p>
          <p className="text-xs text-slate-500">{preview.recipient.maskedUpiId}</p>
          {preview.parsed.amountPaise && (
            <p className="text-sm">Suggested amount: {formatInrFromPaise(preview.parsed.amountPaise)}</p>
          )}
          <Button
            className="w-full"
            onClick={() =>
              navigate(`/app/send?recipient=${preview.recipient.id}${preview.parsed.amountPaise ? `&amount=${preview.parsed.amountPaise / 100}` : ''}`)
            }
          >
            Continue to pay
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setMode('choose')}>
            Scan again
          </Button>
        </Card>
      )}
    </div>
  );
}
