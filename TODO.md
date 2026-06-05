#### Deployment on a Linux VM

Deploy your API and frontend on a free cloud Linux VM, managed by systemd, served over HTTPS via nginx.

Any Linux distro that supports systemd works (suggestion: Debian) — pick based on what your cloud provider offers in the free tier.

**Get a free VM:**

| Provider | Free Tier |
|----------|-----------|
| [Oracle Cloud](https://www.oracle.com/cloud/free/) | Always-free AMD VM (no expiry) — best option |
| [Google Cloud](https://cloud.google.com/free) | e2-micro in US regions — always free |
| [AWS](https://aws.amazon.com/free/) | t2.micro — free for 12 months |
| [Linode/Akamai](https://www.linode.com/lp/free-credit/) | $100 credit for new accounts |
| [Civo](https://www.civo.com/) | $250 credit for new accounts |

**What to set up on the VM:**
1. Install your Linux distro of choice, Go, and nginx
2. Run your **Go API** as a systemd service — auto-starts on boot, auto-restarts on crash
3. Build your **frontend** with `bun build` and serve the static files via nginx (if Web), or skip if CLI
4. Configure **nginx** as a reverse proxy in front of the API (and static files for Web)
5. Enable **HTTPS** with Let's Encrypt via `certbot` — free SSL certificate

**Domain for HTTPS:**
- **Have your own domain?** Point it to your VM IP and use it — Let's Encrypt will issue a cert for it via `certbot`
- **No domain?** Use `sslip.io` — a free wildcard DNS that maps any IP to a domain, no registration needed. If your VM IP is `1.2.3.4`, your domain is `1-2-3-4.sslip.io` and certbot works the same way

> Your API and frontend must be reachable over HTTPS from the public internet when done.