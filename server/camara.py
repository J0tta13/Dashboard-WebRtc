import socket

def obtener_ip_local():
    try:
        hostname = socket.gethostname()
        ip_local = socket.gethostbyname(hostname)
        return ip_local
    except Exception as e:
        return f"Error: {e}"

print("IP local:", obtener_ip_local())
import socket

def obtener_ip_local():
    try:
        hostname = socket.gethostname()
        ip_local = socket.gethostbyname(hostname)
        return ip_local
    except Exception as e:
        return f"Error: {e}"

print("IP local:", obtener_ip_local())
