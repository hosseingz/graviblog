from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from posts.models import Category, Post, Comment
from editorial.models import HotTake

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial categories, authors, posts, and editorial hot takes."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Graviblog demo dataset...")

        # 1. Author
        author, created = User.objects.get_or_create(
            username="alex_vance",
            defaults={
                "first_name": "Alex",
                "last_name": "Vance",
                "handle": "VANCE_HW",
                "role": "EDITOR",
                "avatar": "AV",
                "bio": "Obsessed with oscilloscope frame times, thermal throttling, and uncompromised CRT clarity.",
                "email": "vance@graviblog.dev",
            },
        )
        if created:
            author.set_password("editor12345")
            author.save()

        # 2. Categories
        categories_data = [
            ("HARDWARE", "hardware", "bg-[#FF8A3D] text-black", "Hardware benchmarks & tear-downs"),
            ("GAMING", "gaming", "bg-[#70E000] text-black", "Underground gaming and mechanics"),
            ("RETRO", "retro", "bg-[#4DEEEA] text-black", "CRT phosphors and arcade cabinets"),
            ("TECH", "tech", "bg-[#FFE600] text-black", "Low-level drivers and cyberdecks"),
            ("CRITIQUE", "critique", "bg-[#FF6B97] text-black", "Unapologetic design critiques"),
        ]
        cat_map = {}
        for name, slug, color, desc in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "color_class": color, "description": desc},
            )
            cat_map[name] = cat

        # 3. Post (Hero cover dispatch)
        post, _ = Post.objects.get_or_create(
            slug="the-death-of-60fps-120hz-esports-brutal-reality",
            defaults={
                "title": "THE DEATH OF 60FPS: WHY 120HZ IS THE NEW BRUTAL REALITY FOR ESPORTS",
                "subtitle": "For nearly two decades, 60fps was considered buttery smooth. In 2025, that standard is officially dead.",
                "category": cat_map["HARDWARE"],
                "author": author,
                "read_time": "6 MIN READ",
                "publish_date": timezone.now(),
                "cover_image": "/assets/aistudio/post-detail_aac674a2.png",
                "caption": "FIG 1.0: HIGH-SPEED PHOTON STROBE DROPS CAPTURING MOTION-BLUR RECOVERY ON 120HZ OLED PANEL.",
                "excerpt": "Once the playground of high-bracket Counter-Strike purists obsessing over phosphor lag on oversized CRTs, refresh rate supremacy has gone completely mainstream.",
                "content_markdown": "# The Death of 60FPS\n\nFor nearly two decades, sixty frames per second was the gold standard...",
                "featured": True,
                "issue_number": "ISSUE NO. 084 // FALL EDIT",
                "tags": ["HARDWARE", "ESPORTS", "DISPLAY", "120HZ", "BENCHMARK"],
                "likes_count": 483,
                "bookmarks_count": 142,
                "key_takeaways": [
                    "The 120Hz Threshold is Non-Negotiable: Upgrading from 60Hz yields the single largest competitive latency gain achievable on modern consumer hardware.",
                    "Diminishing Returns Past 240Hz: Going beyond 240Hz yields less than 2.8ms latency delta—prioritize panel response over raw refresh claims.",
                    "GPU Frame Pacing Matters: An unstable 144FPS with frame micro-stutter is measurably worse than a rock-solid, capped 120FPS with 0.1% lows aligned.",
                ],
                "benchmark_data": {
                    "title": "REFRESH LATENCY MATRIX",
                    "rows": [
                        {"target": "LEGACY 60 HZ", "frame_time": "16.6 ms", "end_to_end_lag": "42.8 ms", "hit_confirmation": "Baseline (Sluggish)", "status_color": "bg-[#ffdad6] text-[#ba1a1a]"},
                        {"target": "SWEET SPOT 120 HZ", "frame_time": "8.3 ms", "end_to_end_lag": "21.4 ms", "hit_confirmation": "+46.2% Accuracy", "status_color": "bg-[#ffdbc9] text-[#763300]"},
                        {"target": "PRO TECH 240 HZ", "frame_time": "4.1 ms", "end_to_end_lag": "11.8 ms", "hit_confirmation": "+85.5% Peak Hit", "status_color": "bg-[#5bf9f5] text-[#004645]"},
                    ],
                },
                "test_bench_rig": {
                    "cpu": "AMD Ryzen 7 9800X3D",
                    "gpu": "GeForce RTX 4080 SUPER",
                    "display": "ASUS ROG Swift OLED PG27AQDM",
                    "sensor": "LDAT Latency Analyzer",
                    "os": "Custom Stripped Arch Linux (RT Kernel)",
                },
            },
        )

        # 4. Comments
        Comment.objects.get_or_create(
            post=post,
            author_name="CYBER_KIDD",
            defaults={
                "badge": "CYBER READER",
                "content": "Can confirm: jumping from 60Hz to 144Hz literally felt like taking off grease-smeared glasses.",
                "upvotes": 12,
                "editorial_reply_author": "ALEX VANCE",
                "editorial_reply_content": "Exactly. Once the eye-brain sensor path adapts to sub-10ms phosphor persistence, 60fps feels like a flipbook.",
            },
        )

        # 5. Hot Takes
        HotTake.objects.get_or_create(
            opinion='"PHOTOREALISM IS A CREATIVE DEAD END."',
            defaults={
                "author": "PIXEL PUNCH STAFF",
                "body": "When every AAA title chases 4K pore fidelity, games look like dull Netflix movies. Give us high-framerate cel-shading and unapologetic vector punk or give us nothing.",
                "upvotes": 301,
                "total_votes": 342,
            },
        )
        HotTake.objects.get_or_create(
            opinion='"ANY MONITOR BELOW 120HZ IS A PRODUCTIVITY & GAMING LIABILITY."',
            defaults={
                "author": "VANCE_HW",
                "body": "Stop telling yourself 60Hz is enough for strategy games. Your eyes deserve zero motion blur and instantaneous window drag rendering.",
                "upvotes": 466,
                "total_votes": 512,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo dataset seeded successfully!"))

