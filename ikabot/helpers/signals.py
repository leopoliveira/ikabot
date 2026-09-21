#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import signal
import threading

from ikabot.config import *
from ikabot.helpers.botComm import *


def do_nothing(signal, frame):
    pass


def is_main_thread():
    try:
        return threading.current_thread() is threading.main_thread()
    except Exception:
        return True


def deactivate_sigint():
    if is_main_thread():
        try:
            signal.signal(signal.SIGINT, do_nothing)
        except Exception:
            pass


def create_handler(s):
    def _handler(signum, frame):
        raise Exception("Signal number {:d} received".format(signum))

    return _handler


def setSignalsHandlers(s):
    if is_main_thread():
        signals = [
            signal.SIGINT,
            signal.SIGTERM,
        ]  # signal.SIGQUIT replaced with signal.SIGINT for compatibility
        for sgn in signals:
            try:
                signal.signal(sgn, create_handler(s))
            except Exception:
                pass


def setInfoSignal(session, info):  # send process info to bot
    """
    Parameters
    ----------
    session : ikabot.web.session.Session
    info : str
    """
    if is_main_thread():
        info = "information of the process {}:\n{}".format(os.getpid(), info)

        def _sendInfo(signum, frame):
            sendToBot(session, info)

        try:
            signal.signal(
                signal.SIGABRT, _sendInfo
            )  # kill -SIGUSR1 pid, SIGUSR1 replaced with SIGABRT for compatibility
        except Exception:
            pass
