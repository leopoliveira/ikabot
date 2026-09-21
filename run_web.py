#! /usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IKABOT BRASIL - INICIALIZADOR COMANDO ÚNICO (PAINEL WEB)
Executa o servidor web local e inicia o bot em segundo plano automaticamente.
"""

import os
import sys
import threading
import time
import webbrowser
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Ajusta diretório base
from ikabot import config
from ikabot.helpers.sessionStorage import init_storage

PORT = 8080
URL = f"http://127.0.0.1:{PORT}"


def open_browser():
    """Abre o navegador automaticamente após o servidor subir."""
    time.sleep(1.5)
    try:
        webbrowser.open(URL)
    except Exception:
        pass


def initialize_bot_session():
    """Tenta conectar silenciosamente se houver conta salva com mundo único, sem bloquear o terminal."""
    time.sleep(1.0)
    try:
        from ikabot.ui.server import try_auto_login
        try_auto_login()
    except Exception as e:
        print(f"[Aviso] Conexão automática em segundo plano: {e}")


def main():
    # Inicializa diretório de armazenamento (~/.ikabot)
    home_env = "USERPROFILE" if config.isWindows else "HOME"
    user_home = os.getenv(home_env)
    if user_home:
        try:
            os.chdir(user_home)
        except Exception:
            pass
    init_storage()

    # Banner em Português
    print("=" * 65)
    print("  🏛️  IKABOT BRASIL - PAINEL DE CONTROLE VISUAL")
    print("=" * 65)
    print(f"  [+] Servidor Web Iniciado em: {URL}")
    print("  [+] O navegador abrirá automaticamente em instantes.")
    print("  [+] Pressione Ctrl + C neste terminal para encerrar.")
    print("=" * 65)
    print("")

    # Dispara a abertura do navegador e a conexão do bot em threads paralelas
    threading.Thread(target=open_browser, daemon=True).start()
    threading.Thread(target=initialize_bot_session, daemon=True).start()

    # Inicia o servidor Flask na thread principal
    from ikabot.ui.server import start_server
    try:
        start_server(port=PORT)
    except KeyboardInterrupt:
        print("\nEncerrando o Ikabot Painel Web. Até logo!")
        sys.exit(0)


if __name__ == "__main__":
    main()
