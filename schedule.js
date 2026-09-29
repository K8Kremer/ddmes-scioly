/* =====================================================================
   Season schedule: the one place to edit dates.

   Each entry: date (YYYY-MM-DD), group, and optional note.
   group is one of the keys in GROUPS below, or "none" (no meeting),
   "prep" (whole team) or "special" (field trip, tournament, celebration).

   The home page shows the next few dates; the calendar page shows all
   of them and grays out the ones that have passed.
   ===================================================================== */

var GROUPS = {
  fieldA: { name: "Field A", events: "Geology Rocks!, Buzzworthy, Codebusters" },
  fieldB: { name: "Field B", events: "Deep Blue Sea, Roots & Reptiles, Storm Chasers" },
  decode: { name: "Diagram & Decode", events: "Describe It Build It, Pump It Up, Science Sketchers, Zap Lab" },
  build:  { name: "Build & Test", events: "Beam Me Up, Just Plane Awesome, Ship Shape" }
};

var SCHEDULE = [
  { date: "2026-10-02", group: "fieldA" },
  { date: "2026-10-09", group: "fieldB" },
  { date: "2026-10-16", group: "decode" },
  { date: "2026-10-23", group: "build" },
  { date: "2026-10-30", group: "none" },
  { date: "2026-11-06", group: "fieldA" },
  { date: "2026-11-07", group: "special", title: "Museum meetup", time: "10:00 AM · NC Museum of Natural Sciences",
    note: "Meet at the Daily Planet Cafe, then a 10:45 tour of the insect and arthropod research lab and the Nature Exploration Center. Lunch at the cafe at noon is optional. Sign-up and details coming." },
  { date: "2026-11-13", group: "fieldB" },
  { date: "2026-11-20", group: "decode" },
  { date: "2026-11-27", group: "none", note: "Thanksgiving break" },
  { date: "2026-12-04", group: "build" },
  { date: "2026-12-11", group: "fieldA" },
  { date: "2026-12-18", group: "none" },
  { date: "2026-12-25", group: "none", note: "Winter break" },
  { date: "2027-01-01", group: "none", note: "Winter break" },
  { date: "2027-01-08", group: "fieldB" },
  { date: "2027-01-15", group: "decode" },
  { date: "2027-01-22", group: "build" },
  { date: "2027-01-29", group: "fieldA" },
  { date: "2027-02-05", group: "fieldB" },
  { date: "2027-02-12", group: "decode" },
  { date: "2027-02-19", group: "build" },
  { date: "2027-02-26", group: "fieldA" },
  { date: "2027-03-05", group: "fieldB" },
  { date: "2027-03-12", group: "prep", title: "Tournament prep: whole team", note: "Everyone comes." },
  { date: "2027-03-13", group: "special", title: "Chatham Regional Tournament", time: "Seaforth High School, Pittsboro" },
  { date: "2027-03-19", group: "special", title: "End-of-season celebration", time: "Time TBA" }
];

(function () {
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
                "August", "September", "October", "November", "December"];
  var SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

  function parse(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function isPast(item) { return parse(item.date) < today; }

  function describe(item) {
    var g = GROUPS[item.group];
    if (g) return { title: g.name + " Friday", time: "4:15–5:00 PM · At school", note: g.events };
    if (item.group === "none") return { title: "No meeting", time: "", note: item.note || "" };
    return { title: item.title, time: item.time || "4:15–5:00 PM · At school", note: item.note || "" };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function row(item, longDate) {
    var d = parse(item.date);
    var info = describe(item);
    var li = el("li", "tag-" + item.group);
    var when = el("p", "when", longDate
      ? DAYS[d.getDay()] + ", " + SHORT[d.getMonth()] + " " + d.getDate()
      : DAYS[d.getDay()].slice(0, 3) + " " + SHORT[d.getMonth()] + " " + d.getDate());
    if (info.time) when.appendChild(el("small", null, info.time));
    var what = el("p", "what");
    what.appendChild(el("strong", null, info.title));
    if (info.note) what.appendChild(el("span", null, info.note));
    li.appendChild(when);
    li.appendChild(what);
    if (isPast(item)) li.classList.add("past");
    return li;
  }

  /* Home page: the next few dates. */
  var upcoming = document.getElementById("upcoming");
  if (upcoming) {
    var count = +upcoming.getAttribute("data-count") || 4;
    upcoming.textContent = "";
    SCHEDULE.filter(function (i) { return !isPast(i); })
      .slice(0, count)
      .forEach(function (i) { upcoming.appendChild(row(i, true)); });
  }

  /* Home page hero: the next meeting. */
  var next = document.getElementById("next-meeting");
  if (next) {
    var n = SCHEDULE.filter(function (i) { return !isPast(i) && i.group !== "none"; })[0];
    if (n) {
      var d = parse(n.date), info = describe(n);
      next.querySelector("[data-next=date]").textContent =
        DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() +
        (GROUPS[n.group] || n.group === "prep" ? " · 4:15–5:00 PM" : "");
      next.querySelector("[data-next=what]").textContent = info.title;
    }
  }

  /* Calendar page: every date, by month. */
  var all = document.getElementById("all-dates");
  if (all) {
    all.textContent = "";
    var month = null, list = null;
    SCHEDULE.forEach(function (i) {
      var d = parse(i.date), key = d.getFullYear() + "-" + d.getMonth();
      if (key !== month) {
        month = key;
        all.appendChild(el("h3", "month", MONTHS[d.getMonth()] + " " + d.getFullYear()));
        list = el("ul", "dates schedule");
        all.appendChild(list);
      }
      list.appendChild(row(i, true));
    });
    var first = all.querySelector("li:not(.past)");
    if (first) first.classList.add("next");
  }

  /* Anything marked data-until="YYYY-MM-DD" disappears after that day. */
  Array.prototype.forEach.call(document.querySelectorAll("[data-until]"), function (e) {
    if (parse(e.getAttribute("data-until")) < today) e.hidden = true;
  });
})();
