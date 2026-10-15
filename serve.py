"""Static, loopback-only preview. No application backend or third-party packages."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser

PORT = 8765

def main():
    port = 8765
    for arg in sys.argv[1:]:
        if arg.startswith('--port='):
            try: port = int(arg.split('=', 1)[1])
            except ValueError: pass
    url = f"http://127.0.0.1:{port}/{Path(__file__).resolve().parent.name}/"
    # Serving the KKA folder also makes the original PDF source links work.
    directory = Path(__file__).resolve().parent.parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as error:
        print(f"Tidak bisa membuka preview pada port {port}: {error}")
        print("Tutup preview sebelumnya lalu coba lagi, atau buka index.html langsung.")
        return 1
    print(f"KKA Study Lab: {url}", flush=True)
    print("Biarkan jendela ini terbuka. Tekan Ctrl+C untuk menutup preview.", flush=True)
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
