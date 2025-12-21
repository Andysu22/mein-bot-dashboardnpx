import { getCsrfToken } from "next-auth/react";

export const openLoginPopup = (e) => {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const width = 600;
  const height = 800;
  const left = (window.screen.width / 2) - (width / 2);
  const top = (window.screen.height / 2) - (height / 2);

  const popup = window.open(
    "",
    "Discord Login",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
  );

  if (!popup) {
      alert("Please allow popups!");
      return;
  }

  // Dunkles Design für den Moment, in dem das Fenster aufspringt
  popup.document.title = "connecting...";
  popup.document.body.style.background = "#1a1c1f"; // Verhindert weißes Aufblitzen
  popup.document.body.innerHTML = `
    <div style="background:#1a1c1f; color:#9ca3af; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif; margin:0;">
       <div style="border: 3px solid #374151; border-top: 3px solid #6366f1; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
       <p style="margin-top: 15px; font-size: 14px;">Connecting to Discord...</p>
       <style>
         @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
       </style>
    </div>
  `;

  getCsrfToken().then((csrfToken) => {
     if (!csrfToken) {
         popup.close();
         return;
     }

     const callbackUrl = window.location.origin + "/auth-success";
     const doc = popup.document;
     doc.open();
     doc.write(`
        <!DOCTYPE html>
        <html style="background: #1a1c1f;">
        <head>
            <title>Redirecting...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="background:#1a1c1f; color: #9ca3af; margin:0; font-family:sans-serif;">
            <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
                <p>Logging in...</p>
            </div>
            <form action="/api/auth/signin/discord" method="POST" id="authForm" style="display:none;">
                <input type="hidden" name="csrfToken" value="${csrfToken}" />
                <input type="hidden" name="callbackUrl" value="${callbackUrl}" />
            </form>
            <script>
                document.getElementById('authForm').submit();
            </script>
        </body>
        </html>
     `);
     doc.close();
  });
};