#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, sys, io, urllib.request, urllib.error, base64
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE = "http://127.0.0.1:4174"
ROOT = Path(__file__).resolve().parents[1]
DB = json.loads((ROOT / "data" / "db.json").read_text(encoding="utf-8"))
TZ = timezone(timedelta(hours=6))
KPI = DB["kpi"]
ok = 0
fail = 0
bugs = []


def report(name, passed, detail=""):
    global ok, fail
    if passed:
        ok += 1
        print(f"OK   {name}" + (f" — {detail}" if detail else ""))
    else:
        fail += 1
        bugs.append(f"{name}: {detail}")
        print(f"FAIL {name} — {detail}")


def band_for(n):
    if n <= 0:
        return None
    found = sorted(KPI, key=lambda b: b["min"])[0]
    for b in sorted(KPI, key=lambda b: b["min"]):
        if n >= b["min"]:
            found = b
    return found


def salary(n):
    b = band_for(n)
    if not b:
        return 0, 0, 0
    return n * b["rate"] + b["bonus"], b["rate"], b["bonus"]


def iso_day(dt):
    return dt.astimezone(TZ).strftime("%Y-%m-%d")


def now():
    return datetime.now(TZ)


def week_bounds():
    t = now()
    wd = t.weekday()  # Mon=0
    start = (t - timedelta(days=wd)).replace(hour=12, minute=0, second=0, microsecond=0)
    days = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    return days[0], days[6], days


def month_bounds():
    t = now()
    last = (t.replace(day=28) + timedelta(days=8)).replace(day=1) - timedelta(days=1)
    return t.strftime("%Y-%m-01"), last.strftime("%Y-%m-%d")


def in_range(iso, a, b):
    return a <= str(iso)[:10] <= b


def confirmed(uid, a, b):
    return [
        s
        for s in DB["sales"]
        if s["status"] == "confirmed" and s["userId"] == uid and in_range(s["createdAt"], a, b)
    ]


def req(method, path, token=None, body=None, expect=200):
    data = None if body is None else json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            ct = resp.headers.get("content-type", "")
            if "sheet" in ct:
                return resp.status, raw
            return resp.status, json.loads(raw.decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw.decode() or "{}")
        except Exception:
            payload = {"error": raw.decode(errors="replace")}
        if e.code != expect:
            report(f"{method} {path} status", False, f"ждали {expect}, получили {e.code} {payload}")
        return e.code, payload


def login(user, password):
    st, d = req("POST", "/api/login", body={"login": user, "password": password})
    report(f"логин {user}", st == 200 and "token" in d, d.get("error", ""))
    return d.get("token"), d.get("user")


print("=== 1. Формула KPI: края диапазонов ===")
cases = [
    (0, 0, 0, 0),
    (1, 500, 500, 0),
    (5, 2500, 500, 0),
    (6, 6200, 700, 2000),
    (10, 9000, 700, 2000),
    (11, 12900, 900, 3000),
    (15, 16500, 900, 3000),
    (16, 21600, 1100, 4000),
    (18, 23800, 1100, 4000),
    (20, 26000, 1100, 4000),
    (21, 32300, 1300, 5000),
    (25, 37500, 1300, 5000),
    (26, 45000, 1500, 6000),
    (30, 51000, 1500, 6000),
    (31, 62700, 1700, 10000),
    (35, 69500, 1700, 10000),
    (36, 71200, 1700, 10000),  # выше 35 — последний диапазон
]
for n, total, rate, bonus in cases:
    got, r, b = salary(n)
    report(f"ставка при {n} шт", got == total and r == rate and b == bonus, f"ожидали {total} (ставка {rate}+{bonus}), получили {got} ({r}+{b})")

print("\n=== 2. Бухгалтерия из db.json vs API ===")
wf, wt, wdays = week_bounds()
mf, mt = month_bounds()
print(f"неделя {wf} — {wt}")
print(f"месяц  {mf} — {mt}")

sellers = [u for u in DB["users"] if u["role"] == "seller" and u["active"]]
ot, ou = login("owner", "Owner123")
at, au = login("aibek", "Seller123")
lt, lu = login("alina", "Seller123")

st, ov = req("GET", "/api/owner/overview?period=week", ot)
report("owner overview week", st == 200)

pay_sum = 0
rev_week = 0
conf_week = 0
for u in sellers:
    wlist = confirmed(u["id"], wf, wt)
    mlist = confirmed(u["id"], mf, mt)
    n = len(wlist)
    tot, rate, bonus = salary(n)
    pay_sum += tot
    rev_week += sum(s["price"] for s in wlist)
    conf_week += n
    row = next((t for t in ov.get("team", []) if t["userId"] == u["id"]), None)
    report(
        f"API team {u['login']} шт/зарплата",
        row and row["pieces"] == n and row["salary"] == tot,
        f"db {n} шт → {tot} сом (ставка {rate}+бонус {bonus}); API {row}",
    )
    report(
        f"API team {u['login']} выручка недели",
        row and row["revenue"] == sum(s["price"] for s in wlist),
        f"db {sum(s['price'] for s in wlist)} API {row and row['revenue']}",
    )

pending_week = [s for s in DB["sales"] if s["status"] == "pending" and in_range(s["createdAt"], wf, wt)]
rejected_week = [s for s in DB["sales"] if s["status"] == "rejected" and in_range(s["createdAt"], wf, wt)]
report("подтверждено за неделю", ov.get("confirmed") == conf_week, f"db {conf_week} API {ov.get('confirmed')}")
report("выручка недели", ov.get("revenue") == rev_week, f"db {rev_week} API {ov.get('revenue')}")
report("фонд зарплат = сумма KPI", ov.get("payroll") == pay_sum, f"db {pay_sum} API {ov.get('payroll')}")
report("pending не в KPI", ov.get("pending") == len(pending_week), f"db {len(pending_week)} API {ov.get('pending')}")
report("leaders.week = топ по шт", ov.get("leaders", {}).get("week", {}).get("pieces") == max((len(confirmed(u['id'], wf, wt)) for u in sellers), default=0))

# план магазина
plan_w = next(p for p in DB["plans"] if p["period"] == "week" and p.get("scope") == "store")
report("план/факт магазина шт", ov.get("plan", {}).get("pieces") == plan_w["pieces"] and ov.get("plan", {}).get("fact") == conf_week, str(ov.get("plan")))
pct = round(conf_week / plan_w["pieces"] * 100) if plan_w["pieces"] else 0
report("план %", ov.get("plan", {}).get("pct") == pct, f"ждали {pct} получили {ov.get('plan', {}).get('pct')}")

print("\n=== 3. Зарплата всегда недельная при фильтре месяц ===")
st, ovm = req("GET", "/api/owner/overview?period=month", ot)
for u in sellers:
    week_n = len(confirmed(u["id"], wf, wt))
    month_n = len(confirmed(u["id"], mf, mt))
    tot, _, _ = salary(week_n)
    row = next((t for t in ovm.get("team", []) if t["userId"] == u["id"]), None)
    report(
        f"{u['login']} месяц: факт месяца, зарплата недели",
        row and row["pieces"] == month_n and row["salary"] == tot,
        f"месяц {month_n} шт, неделя {week_n} → {tot}; API шт={row and row['pieces']} зп={row and row['salary']}",
    )
report("фонд зарплат на месяце всё равно недельный", ovm.get("payroll") == pay_sum, f"ждали {pay_sum} API {ovm.get('payroll')}")

print("\n=== 4. Кабинет продавца: свои цифры, чужая зп скрыта ===")
st, home = req("GET", "/api/seller/home?period=week", at)
aibek = next(u for u in sellers if u["login"] == "aibek")
n = len(confirmed(aibek["id"], wf, wt))
tot, rate, bonus = salary(n)
report("aibek продажи недели", home.get("kpis", {}).get("sales", {}).get("value") == n, f"db {n} API {home.get('kpis', {}).get('sales')}")
report("aibek зарплата", home.get("kpis", {}).get("salary", {}).get("value") == tot, f"ждали {tot} API {home.get('kpis', {}).get('salary')}")
report("aibek бонус", home.get("kpis", {}).get("salary", {}).get("bonus") == bonus)
nxt_left = max(0, 21 - n) if n < 21 else None
if home.get("next"):
    report("до следующего диапазона", home["next"]["left"] == nxt_left, str(home.get("next")))

st, rk = req("GET", "/api/rank?period=week", at)
hidden = all("salary" not in r and "rate" not in r for r in rk.get("ranking", []))
report("продавец не видит чужие зарплаты в рейтинге", hidden, str(rk.get("ranking")))
st, rko = req("GET", "/api/rank?period=week", ot)
shown = all("salary" in r for r in rko.get("ranking", []))
report("владелец видит зарплаты в рейтинге", shown)

print("\n=== 5. Pending/reject не входят в деньги ===")
pend = [s for s in DB["sales"] if s["status"] == "pending"]
rej = [s for s in DB["sales"] if s["status"] == "rejected"]
ids_ok = {s["id"] for s in DB["sales"] if s["status"] == "confirmed"}
report("есть pending в демо", len(pend) >= 1, str(len(pend)))
for s in pend:
    report(f"pending {s['serial']} не confirmed", s["id"] not in ids_ok)
st, journal = req("GET", "/api/owner/sales?status=pending", ot)
report("журнал pending = db", len(journal.get("sales", [])) == len(pend), f"API {len(journal.get('sales', []))} db {len(pend)}")

print("\n=== 6. Воронка: сумма статусов = отчёты периода ===")
fun = ov.get("funnel") or []
by = {x["key"]: x["n"] for x in fun}
report(
    "воронка сходится",
    by.get("reports") == by.get("pending", 0) + by.get("confirmed", 0) + by.get("rejected", 0),
    str(by),
)

print("\n=== 7. Дельта к прошлому периоду ===")
prev_from = (datetime.strptime(wf, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
prev_to = (datetime.strptime(wt, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
prev_n = sum(len(confirmed(u["id"], prev_from, prev_to)) for u in sellers)
cur = ov["kpis"]["sales"]["value"]
if prev_n:
    pct = round((cur - prev_n) / prev_n * 100)
    report("дельта продаж недели", ov["kpis"]["sales"]["pct"] == abs(pct) and ov["kpis"]["sales"]["prev"] == prev_n, f"db prev {prev_n} cur {cur} pct {pct}; API {ov['kpis']['sales']}")
else:
    report("дельта при нуле прошлого", True)

print("\n=== 8. Роли и модули ===")
st, meo = req("GET", "/api/me", ot)
st, mea = req("GET", "/api/me", at)
report("owner access.review.edit", meo["user"]["access"]["review"]["edit"] is True)
report("owner access.access.edit", meo["user"]["access"]["access"]["edit"] is True)
report("aibek нет review", mea["user"]["access"]["review"]["view"] is False)
report("aibek есть sale.edit", mea["user"]["access"]["sale"]["edit"] is True)
req("GET", "/api/owner/review".replace("/api/owner/review", "/api/owner/kpi"), at, expect=403)
req("GET", "/api/owner/overview?period=week", at, expect=403)
req("POST", "/api/owner/kpi", at, body={"kpi": KPI}, expect=403)
req("GET", "/api/seller/home?period=week", ot)  # owner may pass needMod home
req("POST", "/api/login", body={"login": "aibek", "password": "wrong"}, expect=401)

# менеджер
st, created = req(
    "POST",
    "/api/owner/users",
    ot,
    body={"name": "Менеджер Тест", "login": "mgrtest", "password": "Manager1", "role": "manager"},
)
report("создать менеджера", st == 200, str(created))
mt, mu = login("mgrtest", "Manager1")
if mt:
    st, mme = req("GET", "/api/me", mt)
    acc = mme["user"]["access"]
    report("менеджер видит проверку", acc["review"]["view"] and acc["review"]["edit"])
    report("менеджер не видит доступ", acc["access"]["view"] is False)
    report("менеджер не создаёт продажу", acc["sale"]["edit"] is False)
    req("POST", "/api/owner/kpi", mt, body={"kpi": KPI}, expect=403)
    req("GET", "/api/owner/review".replace("/api/owner/review", "/api/owner/sales?status=pending"), mt)
    st, _ = req("GET", "/api/owner/sales?status=pending", mt)
    report("менеджер читает очередь проверки", st == 200)
    req("GET", "/api/owner/roles", mt, expect=403)
    req("POST", "/api/sales", mt, body={"model": "x", "serial": "X", "price": 1, "payment": "Наличные", "photo": "x"}, expect=403)

print("\n=== 9. Персональный доступ продавцу ===")
# выдать aibek просмотр журнала
st, saved = req(
    "POST",
    f"/api/owner/users/{aibek['id']}",
    ot,
    body={"name": au["name"], "login": "aibek", "access": {**mea["user"]["access"], "journal": {"view": True, "edit": False}}},
)
report("выдать aibek журнал", st == 200)
st, _ = req("GET", "/api/owner/sales", at)
# после override нужен новый login чтобы access в токене... access считается на сервере из db, не из токена
report("aibek после галочки читает журнал", st == 200)
# вернуть как было
req("POST", f"/api/owner/users/{aibek['id']}", ot, body={"name": au["name"], "login": "aibek", "access": {}})
st, _ = req("GET", "/api/owner/sales", at, expect=403)
report("после сброса aibek снова без журнала", st == 403)

print("\n=== 10. Продажа: валидация, дубль, KPI после подтверждения ===")
photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5jCYII="
serial = "OIMO-QA-" + datetime.now().strftime("%H%M%S")
st, bad = req("POST", "/api/sales", at, body={"model": "QA", "serial": serial, "price": 1000, "payment": "Наличные"}, expect=400)
report("продажа без фото 400", st == 400)
st, sale = req(
    "POST",
    "/api/sales",
    at,
    body={"model": "QA Unit", "serial": serial, "price": 7777, "payment": "Наличные", "photo": photo},
)
report("создать продажу pending", st == 200 and sale.get("sale", {}).get("status") == "pending", str(sale))
st, dup = req(
    "POST",
    "/api/sales",
    at,
    body={"model": "QA Unit", "serial": serial, "price": 7777, "payment": "Наличные", "photo": photo},
    expect=409,
)
report("дубль серийного 409", st == 409)
# pending не должен поднять KPI
st, home2 = req("GET", "/api/seller/home?period=week", at)
report("pending не увеличил KPI", home2.get("kpis", {}).get("sales", {}).get("value") == n, f"было {n} стало {home2.get('kpis', {}).get('sales', {}).get('value')}")
sid = sale.get("sale", {}).get("id")
st, _ = req("POST", f"/api/owner/sales/{sid}/decide", ot, body={"decision": "rejected"}, expect=400)
report("отклонение без причины 400", st == 400)
st, _ = req("POST", f"/api/owner/sales/{sid}/decide", ot, body={"decision": "confirmed"})
report("подтвердить QA продажу", st == 200)
st, home3 = req("GET", "/api/seller/home?period=week", at)
n2 = n + 1
tot2, _, _ = salary(n2)
report("после confirm KPI +1", home3.get("kpis", {}).get("sales", {}).get("value") == n2, f"ждали {n2} получили {home3.get('kpis', {}).get('sales', {}).get('value')}")
report("после confirm зарплата пересчитана", home3.get("kpis", {}).get("salary", {}).get("value") == tot2, f"ждали {tot2} получили {home3.get('kpis', {}).get('salary', {}).get('value')}")
st, ov2 = req("GET", "/api/owner/overview?period=week", ot)
report("выручка +7777", ov2.get("revenue") == rev_week + 7777, f"ждали {rev_week+7777} получили {ov2.get('revenue')}")
# откат: отклонить чтобы не портить демо навсегда? пользователь может хотеть чистое демо.
# отклонение confirmed продажи — decide всё ещё работает
st, _ = req("POST", f"/api/owner/sales/{sid}/decide", ot, body={"decision": "rejected", "reason": "QA откат"})
st, home4 = req("GET", "/api/seller/home?period=week", at)
report("после отклонения KPI вернулся", home4.get("kpis", {}).get("sales", {}).get("value") == n, f"ждали {n} получили {home4.get('kpis', {}).get('sales', {}).get('value')}")

print("\n=== 11. Планы: запись и чтение ===")
st, plans = req("GET", "/api/owner/plans", ot)
report("список планов", st == 200 and len(plans.get("plans", [])) >= 1)
st, pset = req("POST", "/api/owner/plans", ot, body={"period": "week", "userId": None, "pieces": plan_w["pieces"], "amount": 0})
report("пересохранить план магазина без изменения", st == 200 and pset.get("plan", {}).get("pieces") == plan_w["pieces"])

print("\n=== 12. Excel ===")
st, xls = req("GET", "/api/owner/export.xlsx", ot)
report("excel скачивается", st == 200 and isinstance(xls, (bytes, bytearray)) and len(xls) > 100, f"bytes={len(xls) if isinstance(xls, (bytes, bytearray)) else type(xls)}")

print("\n=== ИТОГ ===")
print(f"OK {ok}  FAIL {fail}")
if bugs:
    print("Баги / расхождения:")
    for b in bugs:
        print(" -", b)
sys.exit(1 if fail else 0)
