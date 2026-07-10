# GoByRail.com Feature Demo
Includes local timetable search, 3-letter station autocomplete, train route details, class and quota selection, multi-passenger booking flow, project PNR status, booked-ticket history, cancellation/refund simulation, and demo eWallet persistence.

Run:
npm install
npm start

This is an academic simulation. It does not perform real IRCTC bookings, payments, PNR creation, seat inventory, or live train tracking.


## Media discovery section
The Book Ticket page includes an auto-scrolling promotional carousel, manual previous/next controls, Vande Bharat imagery, an embedded railway documentary video, a railway-services promotional card, and a scrolling railway information ticker.
Images are stored locally in public/assets. Wikimedia Commons source/licence details should be retained in project documentation for attribution.


## Premium booking flow
Adds paginated/load-more train results, class-wise availability cards, green/RAC/red visual states, passenger details, berth preferences, auto-upgradation preference, confirmed-berth preference, same-coach preference, travel-insurance UI, contact details, fare review and demo-wallet payment.

Seat counts are explicitly deterministic demo values because the public timetable source does not provide live reservation inventory. They must not be represented as current IRCTC availability.


## Random demo availability behavior
On every server page refresh, each train/class card randomly receives AVAILABLE, RAC, or WL and a random number from 1 to 250. Values remain stable during the current page session so selecting a class and proceeding to booking does not unexpectedly change the displayed state. Selecting a class reveals a Book Now action beneath that train card.


## Mandatory validation
Passenger name, age, mobile number, and Gmail address are mandatory. Names are normalized and checked against a conservative name pattern; ages must be whole numbers from 1 through 79; mobile numbers must be 10-digit Indian mobile-format numbers beginning 6–9; Gmail addresses must use a syntactically valid local part and end in @gmail.com. Client-side validation improves the demo UX but production systems must repeat validation server-side.


## Login and signup
Adds mandatory login/signup forms. Signup validates full name, Gmail format, Indian mobile format, past date of birth, strong password, matching confirmation, terms acceptance, duplicate email and duplicate mobile. Login requires both fields and checks locally registered demo users.

Security note: this is an academic browser-local authentication demo. Passwords in localStorage are not secure for production. A production version must use server-side password hashing, secure sessions, CSRF protection, rate limiting, account verification and recovery flows.


## Account-linked bookings, berth confirmation, and 12-hour time
Bookings are now stored under a per-account localStorage key derived from the signed-in email. Logging into another project account loads only that account's bookings. Completing a project booking assigns confirmed coach/seat details to every passenger and displays them in My Bookings. Timetable display values such as 11:05:00 are formatted as 11:05 AM, and 23:05:00 as 11:05 PM.

This remains an academic browser-local demo; berth assignments are project simulation values, not real railway seat allocations.


## Smart station ranking and journey duration
Station suggestions now use weighted relevance: exact name-prefix matches rank above code-prefix, word-prefix, contains-name, and contains-code matches, while a curated popularity weight promotes major hubs such as Mumbai, New Delhi, Howrah, Chennai, Bengaluru, Secunderabad and Visakhapatnam. Train cards calculate elapsed journey time from departure/arrival plus schedule day offsets and display it between the two times.


## Premium profile experience
Adds an account-specific My Profile page with member hero, initials avatar, personal information, booking statistics, passenger count, wallet balance, membership tier, journey insights, quick actions, editable name/mobile/date of birth, and password update flow requiring the current password plus strong-password validation.

This academic demo still stores account credentials in localStorage. Production authentication requires server-side hashing and secure sessions.


## User dropdown and route explorer
My Profile is no longer a top navigation option. Signed-in users can click their displayed name/avatar to open an account dropdown with View Profile, My Bookings, Wallet and Logout.

The Train Schedule screen has been redesigned as a colourful Route Explorer with a hero section, train-number search card, route summary, total journey duration, scheduled stop count and a vertical station timeline with AM/PM arrival and departure times.


## Colourful service dashboards
PNR Status, My Bookings and Wallet now have distinct colourful visual identities and richer account-specific presentation. PNR results show journey and passenger berth cards; bookings use ticket-style journey cards; wallet has balance hero, amount shortcuts, benefits and simulation notice.

## Train schedule halt filtering
The Route Explorer filters schedule records whose arrival and departure are both missing or explicitly marked as no-halt/passing values. Stations with an actual arrival or departure event remain in the displayed stopping timeline.


## Wallet precision and success animation
Wallet values are displayed with exactly two decimal places using JavaScript `toFixed(2)`. Successful demo top-ups show an animated green tick confirmation with the exact amount added.

## Useful journey services
The wallet dashboard now includes Current Booking, Boarding Point, Reservation Chart, Refund History, Journey Alerts and Food on Journey entry cards. These are project UI services and do not claim to execute real IRCTC transactions or official railway operations.


## Advanced account tools
The wallet balance typography is enlarged and uses tabular numerals for better readability with large balances. Added account-scoped Favourite Routes, Master Passenger List, Journey Reminders and Travel Analytics. Data for these tools is stored separately per signed-in project account in browser localStorage.


## Master Passenger List booking integration
Saved master passengers are now available directly in the passenger-details step of Book Ticket. The user can click Add From Master List, select one or more saved passengers, and import their name, age and gender into the booking form. The six-passenger booking limit is enforced and imported passengers remain editable before review.


Added Admin Dashboard, DSA Lab, advanced train filters and Website Creators page.
Creators: 12406138 LANKALAPALLI AKHIL; 12406836 Singireddy Shashank; 12406168 Bodasingi Sandeep; 12413472 Esuru Narendranath; 12405516 Telu Chaitanya Krishna.