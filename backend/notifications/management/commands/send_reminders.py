from django.core.management.base import BaseCommand

from notifications.push import is_configured
from notifications.reminders import run


class Command(BaseCommand):
    help = "Send every reminder that is due right now (one pass). Safe to run as often as you like."

    def handle(self, *args, **options):
        if not is_configured():
            self.stderr.write("Web Push isn't configured: set VAPID_* in backend/.env (see generate_vapid_keys).")
            return
        self.stdout.write(f"Sent {run()} reminder(s).")
