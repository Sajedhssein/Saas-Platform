<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);padding:36px 40px;color:#fff;">
              <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">Password Recovery</div>
              <h1 style="margin:12px 0 0;font-size:32px;line-height:1.2;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hello,</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">You are receiving this email because we received a password reset request for your account.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td style="padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                    <div style="font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Password reset details</div>
                    <div style="font-size:15px;line-height:1.8;">
                      <div><strong>Email:</strong> {{ $email }}</div>
                      <div><strong>Expires:</strong> {{ $expireMinutes }} minutes</div>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;">Click the button below to reset your password and regain access to your account.</p>
              <p style="margin:0 0 28px;">
                <a href="{{ $resetUrl }}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;">Reset Password</a>
              </p>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#64748b;">If the button does not work, paste this link into your browser:</p>
              <p style="margin:0 0 28px;font-size:13px;line-height:1.7;word-break:break-all;">
                <a href="{{ $resetUrl }}" style="color:#1d4ed8;">{{ $resetUrl }}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">If you did not request a password reset, no further action is required.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
