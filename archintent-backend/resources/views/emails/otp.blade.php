<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your email — ArchIntent</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .header { background: #4338ca; padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; color: #c7d2fe; font-size: 14px; }
        .body { padding: 36px 32px; }
        .greeting { font-size: 15px; color: #374151; margin-bottom: 16px; }
        .code-box { background: #f5f3ff; border: 2px dashed #818cf8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .code { font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #4338ca; font-family: 'Courier New', monospace; }
        .expiry { font-size: 13px; color: #6b7280; margin-top: 8px; }
        .info { font-size: 14px; color: #6b7280; line-height: 1.6; }
        .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
        .footer strong { color: #4338ca; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>ArchIntent</h1>
            <p>Pakistan's Architecture Marketplace</p>
        </div>
        <div class="body">
            <p class="greeting">Hi {{ $userName }},</p>
            <p class="info">Use the code below to verify your email address. It expires in 10 minutes.</p>

            <div class="code-box">
                <div class="code">{{ $otpCode }}</div>
                <div class="expiry">Expires in 10 minutes</div>
            </div>

            <p class="info">If you didn't create an ArchIntent account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            &copy; 2026 <strong>ArchIntent</strong> &mdash; Karachi, Pakistan
        </div>
    </div>
</body>
</html>
