import socket
import sys

def is_port_open(host="127.0.0.1", port=27017, timeout=1.5) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except OSError:
        return False

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 27017
    if is_port_open(port=port):
        print(f"PORT_{port}_ONLINE")
        sys.exit(0)
    else:
        print(f"PORT_{port}_OFFLINE")
        sys.exit(1)
