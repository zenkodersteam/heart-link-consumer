# -*- coding: utf-8 -*-
# Regenerates ../heartlink-consumer-guide.html from ./screenshots.
import base64, io, os

try:
    from PIL import Image
    HAVE_PIL = True
except Exception:
    HAVE_PIL = False

HERE = os.path.dirname(os.path.abspath(__file__))
SS = os.path.join(HERE, 'screenshots')
OUT = os.path.join(HERE, '..', 'heartlink-consumer-guide.html')

BRAND = {
    'bg': '#16051F',
    'surface': '#22102c',
    'surface2': '#2b1538',
    'ink': '#f8f0fb',
    'muted': '#d7c7df',
    'line': '#4f2b65',
    'brand': '#E91E73',
    'gold': '#D6A84F',
    'frame': '#0f0814',
    'serif': 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
    'sans': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}


def img(name, w=1100, q=78):
    path = os.path.join(SS, f'{name}.png')
    if not os.path.exists(path):
        return None
    if HAVE_PIL:
        im = Image.open(path).convert('RGB')
        if im.width > w:
            im = im.resize((w, int(im.height * (w / im.width))), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format='JPEG', quality=q, optimize=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()


SECTIONS = [
    (
        'What the consumer side actually is',
        'HeartLink is not an inmate self-serve social profile system. The current consumer side is the outside-user experience: people on the outside create an account, browse approved profiles, save favorites, and send printed-mail-style messages. The inmate side begins offline and operationally, then becomes visible here only after staff verification, photo review, and payment activation.',
        [('welcome', 'The public welcome experience frames HeartLink as a connection platform, then leads outside users into account creation.')],
    ),
    (
        'Scenario 1 — outside-user onboarding',
        'Non-inmate onboarding is now a real multi-step profile flow, not just account creation. After sign-up and email verification, outside users complete the applicable intake-form questions: identity, connection intent, lifestyle, communication preferences, story, what they are looking for, optional photo, and review/submit. Inmate-only facility, incarceration, payment, and message-ID fields stay out of this consumer flow.',
        [
            ('sign-up', 'Account creation is the first live onboarding step for outside users.'),
            ('onboarding-identity', 'Identity captures applicable profile context such as how the outside user identifies, religion, and who they are interested in.'),
            ('onboarding-connection', 'Connection captures the kind of correspondence or relationship pace the outside user is looking for.'),
            ('onboarding-lifestyle', 'Lifestyle captures optional compatibility context from the intake form without forcing irrelevant inmate-only data.'),
            ('onboarding-communication', 'Communication keeps letters central while capturing pace, emotional intention, and facility-approved channels.'),
            ('onboarding-story-looking-for', 'The story step now separates “About you” from “What I’m looking for,” matching the intake form’s additional-notes intent.'),
            ('onboarding-review', 'The review step lets the user confirm all captured profile categories before moderation submission.'),
        ],
    ),
    (
        'Scenario 2 — browsing approved inmate profiles',
        'Outside users never browse raw inmate submissions. They browse approved public profiles only. The product separates intake from publishing: admin staff review the mailed or uploaded application, match payment, moderate photos, and then activate the profile. The current browse surface has been polished so the profile deck and story column align at the same top y-position, stretch to matched height, and keep responsive breathing room across desktop sizes.',
        [
            ('browse-home', 'The browse deck is the main discovery surface for approved public profiles, with equal-height desktop columns and balanced spacing.'),
            ('browse-filters', 'Discovery can be narrowed with the current filter set.'),
            ('profile-detail', 'A full profile view gives more context before a user saves or messages someone.'),
        ],
    ),
    (
        'Scenario 3 — favorites and revisiting people',
        'Once an outside user finds someone they want to keep track of, the current product supports a saved-profile loop. The liked screen intentionally avoids redundant heart badges because every profile on that screen is already liked.',
        [('liked', 'Liked profiles give the user a revisit list without repeating a redundant liked indicator on each card.')],
    ),
    (
        'Scenario 4 — inmate onboarding today: offline first, staff mediated',
        'This is the piece the current guide needed to explain better. Inmates do not create online profiles directly in the consumer app. Their onboarding starts with a paper application and supporting materials that are mailed in, scanned, uploaded by staff, OCR-reviewed, corrected, verified, photo-reviewed, payment-matched, and only then promoted into a public-facing HeartLink profile. The consumer side is the destination of that pipeline, not the origin.',
        [],
    ),
    (
        'Scenario 5 — inmate photo submission',
        'The operating model in the project docs is explicit: photo submission is tied to the inmate plan and can arrive by phone, email, or mail, with the count governed by plan tier. Those photos are not self-posted into a live inmate account. They are received operationally, attached to the intake/application record, reviewed by staff, and then surfaced on the public profile after approval. This is why the system has an admin photo-review lane and an activation gate.',
        [('profile-detail', 'The consumer sees only the approved result: moderated photos on the public profile.')],
    ),
    (
        'Scenario 6 — videos for inmates',
        'Today the docs support phone/video availability as captured profile information, not a live in-app inmate video profile feature. The intake form stores communication-platform IDs and phone/video availability, but the MVP does not ship an inmate-managed video upload or public video-profile workflow. So the honest guide structure here is: video/phone availability can be represented as profile data, but the operational workflow for family-submitted photo/video association still needs deeper productization and deterministic mapping rules.',
        [],
    ),
    (
        'Scenario 7 — letters and mailbox',
        'HeartLink communication is framed as physical-mail-backed correspondence, not real-time chat. On the consumer side, a user writes a letter in the mailbox UI; on the back end it is printed and mailed to the facility; replies are scanned back in by the team. Writing is gated behind liked/saved profiles so users cannot bypass the paywall by jumping straight to compose.',
        [('mailbox', 'The mailbox UI presents a clean digital layer over printed outbound letters and scanned inbound replies, with compose access tied to liked profiles.')],
    ),
    (
        'Scenario 8 — sponsor and plan context',
        'The consumer surface also includes sponsor and subscription context. This belongs in the guide because it explains the plan-supported side of the experience and how users understand what is available before or after creating a connection.',
        [('sponsor', 'The sponsor/plan surface explains the support path without making the browse experience feel like a generic dating app.')],
    ),
    (
        'Scenario 9 — support and resources around the core loop',
        'Beyond the original browse-and-connect MVP, the product now includes support and resources surfaces. These matter because the HeartLink experience is broader than a swipe deck: users need trust-building, guidance, and help once they enter the platform.',
        [
            ('resources', 'Resources extend the experience with informational and support-oriented content.'),
            ('support', 'Support gives users a direct help lane when they need assistance.'),
            ('account', 'Account is where ongoing self-serve management lives for the outside user.'),
        ],
    ),
    (
        'Documentation status for MVP handoff',
        'This guide now needs new screenshot evidence for the expanded outside-user onboarding steps and sponsor surface. Operational scenarios such as inmate onboarding, staff-mediated photo intake, and outbound mail still belong primarily in the admin guide and offline intake documentation; the consumer guide should stay focused on the public/outside-user experience.',
        [],
    ),
]


def frame(name, cap):
    src = img(name)
    inner = (
        f'<img loading="lazy" src="{src}" alt="{cap}"/>'
        if src else
        f'<div class="placeholder"><span>{name}.png</span>'
        f'<em>Drop this screenshot into _src/screenshots/ and re-run build_guide.py</em></div>'
    )
    return f'''<figure class="shot">
      <div class="browser">
        <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <div class="url">heart-link-consumer.vercel.app</div></div>
        <div class="viewport">{inner}</div>
      </div>
      <figcaption>{cap}</figcaption>
    </figure>'''


def render_section(i, title, intro, shots):
    num = f'{i:02d}'
    frames = '\n'.join(frame(n, c) for n, c in shots)
    steps_html = f'<div class="shots">{frames}</div>' if shots else '<div class="note-block">This scenario is grounded in the project scope and workflow docs, but it does not yet have a dedicated consumer-only screenshot surface.</div>'
    return f'''<section class="task" id="s{num}">
      <div class="task-head">
        <span class="num">{num}</span>
        <div><h2>{title}</h2><p class="intro">{intro}</p></div>
      </div>
      {steps_html}
    </section>'''


toc = '\n'.join(
    f'<a href="#s{i:02d}"><span>{i:02d}</span>{title}</a>'
    for i, (title, _, _) in enumerate(SECTIONS, 1)
)
body = '\n'.join(render_section(i, *s) for i, s in enumerate(SECTIONS, 1))

HTML = f'''<title>HeartLink — Consumer guide</title>
<style>
:root {{
  --bg:{BRAND['bg']}; --surface:{BRAND['surface']}; --surface2:{BRAND['surface2']}; --ink:{BRAND['ink']}; --muted:{BRAND['muted']};
  --line:{BRAND['line']}; --brand:{BRAND['brand']}; --gold:{BRAND['gold']}; --frame:{BRAND['frame']};
  --serif:{BRAND['serif']}; --sans:{BRAND['sans']};
}}
*{{ box-sizing:border-box; }}
body{{ margin:0; background:linear-gradient(180deg,var(--bg),#120418); color:var(--ink); font-family:var(--sans); line-height:1.62; -webkit-font-smoothing:antialiased; }}
.wrap{{ max-width:1080px; margin:0 auto; padding:0 24px 96px; }}
header.top{{ text-align:center; padding:72px 0 40px; }}
.brandmark{{ font-family:var(--serif); font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); font-size:15px; margin-bottom:22px; }}
header.top h1{{ font-family:var(--serif); font-weight:700; font-size:clamp(34px,6vw,54px); line-height:1.08; margin:0 0 16px; letter-spacing:-.01em; }}
header.top p{{ max-width:70ch; margin:0 auto; color:var(--muted); font-size:18px; }}
nav.toc{{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:10px; margin:18px 0 56px; padding:22px; background:linear-gradient(180deg,var(--surface),var(--surface2)); border:1px solid var(--line); border-radius:18px; }}
nav.toc a{{ display:flex; align-items:baseline; gap:10px; text-decoration:none; color:var(--ink); font-size:15px; padding:6px 8px; border-radius:9px; }}
nav.toc a:hover{{ background:rgba(255,255,255,.05); color:#fff; }}
nav.toc a span{{ font-family:var(--serif); color:var(--gold); font-weight:700; font-variant-numeric:tabular-nums; }}
.task{{ padding:44px 0; border-top:1px solid var(--line); }}
.task-head{{ display:flex; gap:22px; align-items:flex-start; margin-bottom:28px; }}
.task-head .num{{ font-family:var(--serif); font-size:40px; font-weight:700; color:var(--gold); line-height:1; font-variant-numeric:tabular-nums; min-width:56px; }}
.task h2{{ font-family:var(--serif); font-size:clamp(24px,3.4vw,32px); margin:0 0 8px; letter-spacing:-.01em; }}
.intro{{ margin:0; color:var(--muted); font-size:17px; max-width:76ch; }}
.shots{{ display:grid; gap:34px; }}
figure.shot{{ margin:0; display:flex; flex-direction:column; gap:14px; }}
.browser{{ border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--surface); box-shadow:0 22px 50px -26px rgba(0,0,0,.55); }}
.bar{{ display:flex; align-items:center; gap:7px; padding:11px 14px; background:#1a0b22; border-bottom:1px solid var(--line); }}
.bar .dot{{ width:11px; height:11px; border-radius:50%; background:var(--line); }}
.bar .url{{ margin-left:12px; font-size:13px; color:var(--muted); background:rgba(255,255,255,.04); border:1px solid var(--line); border-radius:999px; padding:4px 14px; letter-spacing:.01em; }}
.viewport{{ background:var(--surface); }}
.viewport img{{ display:block; width:100%; height:auto; }}
.placeholder{{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; min-height:300px; padding:40px; text-align:center; background:repeating-linear-gradient(45deg,#1a0b22,#1a0b22 12px,var(--surface) 12px,var(--surface) 24px); }}
.placeholder span{{ font-family:var(--serif); font-size:20px; color:var(--brand); }}
.placeholder em{{ font-style:normal; font-size:14px; color:var(--muted); max-width:36ch; }}
figure.shot figcaption{{ font-size:15px; color:var(--muted); line-height:1.55; padding:0 2px; max-width:80ch; }}
.note-block{{ padding:18px 20px; border:1px solid var(--line); border-radius:14px; background:rgba(233,30,115,.08); color:var(--muted); max-width:78ch; }}
footer{{ text-align:center; color:var(--muted); font-size:14px; padding-top:48px; border-top:1px solid var(--line); }}
footer b{{ color:var(--brand); font-family:var(--serif); letter-spacing:.04em; }}
</style>
<div class="wrap">
  <header class="top">
    <div class="brandmark">HeartLink</div>
    <h1>The consumer side, by scenario</h1>
    <p>A scenario-based walkthrough of HeartLink’s consumer experience: outside-user onboarding, approved-profile browsing, favorites, account/subscription flow, and printed-mail communication.</p>
  </header>

  <nav class="toc">{toc}</nav>

  {body}

  <footer>
    <p><b>HeartLink</b> · Consumer guide · heart-link-consumer.vercel.app<br/>This walkthrough is grounded in the current live consumer surface plus the project scope and workflow docs that define how inmate intake, photos, and communications actually work.</p>
  </footer>
</div>'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(HTML)
print('wrote', OUT, round(os.path.getsize(OUT) / 1024), 'KB', '(Pillow: %s)' % ('yes' if HAVE_PIL else 'no — images embedded full-size'))
