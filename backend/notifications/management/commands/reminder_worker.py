import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone

from notifications.push import is_configured
from notifications.reminders import run


class Command(BaseCommand):
    help = "Keep running and send due reminders every minute. Stop with Ctrl+C."

    def handle(self, *args, **options):
        if not is_configured():
            self.stderr.write("Web Push isn't configured: set VAPID_* in backend/.env (see generate_vapid_keys).")
            return
        self.stdout.write("Reminder worker running — checking every minute. Press Ctrl+C to stop.")
        try:
            while True:
                close_old_connections()
                sent = run()
                if sent:
                    self.stdout.write(f"{timezone.localtime():%H:%M} sent {sent} reminder(s)")
                # Wake shortly after the start of the next minute.
                time.sleep(60 - time.time() % 60 + 1)
        except KeyboardInterrupt:
            self.stdout.write("Stopped.")
