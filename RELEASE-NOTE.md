# 🎬 Studio Staffing Board 0.1.2

## 👋 What’s new?

Need to know who can actually take on more work this month?

The Studio Staffing Board brings people, projects, allocations, leave, and public holidays into one monthly view, so producers, artists, and leads do not have to piece the answer together from different files.

## 📅 Pick a month, get the picture

Use the arrows at the top of the board to move between months.

For each person you can see:

- what they are working on
- how much of their time is already allocated
- how much capacity they really have that month
- whether they still have room for more work

🎯 Capacity starts from FTE. A full-time person has 100% contractual capacity, while 0.6 FTE starts at 60%.

Leave and public holidays then reduce the capacity available that month, so someone who looks free on paper may actually have less room than expected.

The board makes that easy to spot:

- 🟢 **Available** — can take on more work
- 🟡 **At capacity** — fully allocated
- 🔴 **Over capacity** — already carrying more work than their effective capacity

## 👤 Want the details?

Open a person from the board to see:

- their monthly capacity breakdown
- their projects across the selected year
- leave and public holidays for the month
- their current allocation percentages

You can also edit an existing allocation from here.

Planning ahead is allowed too: future project allocations can be updated before the project starts.

Over-allocation is allowed, so the board can show real planning conflicts instead of blocking them.

## 📂 Keeping the board fresh

Use **Import data** to load the latest:

- People CSV
- Projects CSV
- Leave Calendar ICS

A successful import becomes the new current studio snapshot.

If someone, a project, or a calendar event is missing from the latest files, it is removed from the current snapshot.

If something goes wrong during import, the previous valid staffing picture stays untouched. Fix the source file and try again.

## 🌴 Time off matters

Public holidays only reduce capacity for the matching studio:

- Bristol → UK holidays
- Porto → Portugal holidays

Personal leave also reduces effective capacity.

If leave and a public holiday land on the same working day, that day only counts once.

Ceremonies and other non-leave calendar events can still be imported, but they do not affect staffing capacity and are not shown on the staffing views.

## 🚦One thing to remember

Edits made in the UI are planning changes, but the Projects CSV remains the source of truth.

A later Projects import can replace those allocation edits.
