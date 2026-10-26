# Goats Store
## 01. Document control and purpose
This manual describes Goats Store as implemented in source revision 22cd272 on the password-reset branch. It is an operational and technical reference for the business owner, administrators, support staff, developers and deployment operators. Application package version: 2.0.0. Documentation version: 2.0. Review date: 26 October 2026.

The document distinguishes implemented behavior from operating recommendations and future work. It does not assert that a particular production database, mail sender, domain or backup policy has been configured. Those settings must be verified in the relevant provider dashboards. No customer records, passwords, connection strings or API keys are included.

| Control | Value |
|---|---|
| Repository | github.com/cabr444/Goat_Store |
| Source baseline | password-reset / 22cd272 |
| Document owner | Goats Store project administrator |
| Intended use | Administration, support, deployment and maintenance |
| Master formats | Editable Word document and versioned Markdown source |
| Review triggers | Changes to workflows, permissions, schema, dependencies or hosting |

The Word file can be edited in Microsoft Word, LibreOffice Writer or an application supporting DOCX. For reproducible updates, edit the corresponding Markdown source, update the revision record and regenerate the document. Screens, policies and production settings may change after this baseline.

## 02. Executive overview and scope
Goats Store is a Spanish-language storefront for streaming plans, digital services, courses and optional physical-product departments. Customers pay using an internal prepaid balance in Colombian pesos (COP). Visitors can browse and fill a cart without registering; an authenticated account is required to purchase.

The home page uses a marketplace-style layout with Goats branding, a search bar, promotional banners and department carousels. Streaming has a separate discovery/catalog experience. ADMIN manages products, prices, images, display order, balances, sales and private streaming inventory. Tienda and Segunda can be hidden from visitors and CLIENTE accounts without deleting historical purchases.

Streaming inventory uses one canonical entry per access. An individual profile may be offered through several plans of the same platform. Selling it through any one plan removes that profile from every linked plan. A whole account is a separate single-unit mode and cannot also be registered as independently saleable profiles. Combos reserve eligible individual profiles from the same inventory.

Registration is immediate; email confirmation is not required. Password recovery uses a separate email service. The application runs on its hosting platform independently of the developer's PC. Automated bank reconciliation, refunds, shipping integration, course hosting and seller payouts remain outside the implemented scope.

## 03. Roles and permission model
Permissions are checked on the server. Hiding a button is a user-interface measure; it does not replace the corresponding API authorization check. ADMIN is created privately through the seed process and cannot be selected during public signup. CLIENTE and VENDEDOR can be selected at signup. Guests can browse permitted public catalogues and add to a local cart, but cannot buy, view private receipts, recharge balances or access administrator controls.

| Capability | CLIENTE | VENDEDOR | ADMIN |
|---|---|---|---|
| Browse permitted catalog and buy with balance | Yes | Yes | Yes |
| View own profile, purchases and receipts | Yes | Yes | Yes |
| Publish products | No | Own products | Yes |
| Change product price, description and manual stock | No | Own products | Any product |
| Manage private streaming entries and images | No | No | Yes |
| Recharge customer balances | No | No | Yes |
| Reorder product/category cards | No | No | Yes |
| Enable or disable Tienda and Segunda | No | No | Yes |
| Open administrator dashboard | No | No | Yes |
| Access client-disabled sections | No | Yes | Yes |

Seller registration is open; no seller approval workflow is currently implemented. Product ownership limits seller changes. Profiles can show recent seller sales, but a purchase does not automatically credit a seller balance or settle a commission. These are separate future business functions.

Administrators should use a private account, a unique password and restricted access to the database and hosting dashboards. Provider-level multifactor authentication is recommended; the application does not currently include its own MFA flow.

## 04. Navigation and customer experience
Public navigation includes Inicio, Streaming, Combos, Tienda, Segunda, Cursos and contact functions, subject to section visibility. Productos and Beneficios are no longer separate home sections. Guests see an entry to sign in/register; balance, profile and sign-out controls appear only for authenticated users.

| Route | Purpose and access |
|---|---|
| / | Public marketplace home, search and product carousels |
| /catalogo?categoria=Streaming | Public streaming discovery, editorial shelves and digital filters |
| /catalogo?categoria=Combos | Public combo catalogue |
| /store | Public Tienda; guests/clients redirect when disabled |
| /store?personalizados=1 | Tienda filtered to Vasos and Camisetas |
| /segunda | Public used-goods catalogue; guests/clients redirect when disabled |
| /cursos | Public course catalogue |
| /acceso | Login, immediate registration and recovery entry |
| /perfil | Authenticated profile, balance, spending and recent activity |
| /pedidos | Private paginated purchases and receipts |
| /administracion/ventas | ADMIN sales dashboard and operating shortcuts |
| /administracion/ventas/[id] | ADMIN order details and private delivery snapshots |
| /administracion/clientes | ADMIN users, balances, purchases and recent recharges |
| /administracion | ADMIN catalogue, streaming accounts, images and settings |
| /restablecer-contrasena | Password reset using an emailed token |
| /confirmar-correo | Compatibility notice; confirmation is retired |

The profile circle supports hover, click, touch and keyboard. Perfil and Pedidos open private pages; ADMIN also sees Administración. Soporte and Recargas open WhatsApp to +57 3223037790 with a corresponding prepared message. The visitor decides whether to send it.

Guest carts persist through the login/registration journey. A guest purchase opens authentication and returns to the intended cart or direct-purchase confirmation; authentication does not itself charge the balance. Tienda/Segunda switches apply to home links/carousels, account headers, catalogue responses, page access and checkout. Previous purchases remain available in private history.

## 05. Registration, login and password recovery
To register, open Registrarse, enter a name, email, password and account type, then select Crear cuenta. A successful response creates the User immediately and returns the form to login with a success message. The password field is cleared. The user then selects Entrar a Goats with the new credentials; the welcome animation appears only after successful login.

Email addresses are trimmed and lowercased for signup and login. A database unique constraint prevents duplicate accounts, including simultaneous signup attempts. Registration passwords require 10 to 128 characters and a maximum of 72 UTF-8 bytes, avoiding bcrypt truncation. Passwords are stored as bcrypt hashes, not readable text. A visibility control lets users show or hide entered passwords.

Old waiting-screen tickets are removed from browser session storage. Verification, resend and registration-status endpoints are retired with HTTP 410. Old pending registrations do not automatically become accounts; those users must register again. PendingRegistration remains in the schema for historical data and migration compatibility.

Password recovery uses ¿Olvidaste tu contraseña? and requires a configured Resend API key and authorized EMAIL_FROM. Reset tokens expire after 30 minutes, are single-use and are stored as SHA-256 hashes. Successful reset increments sessionVersion to invalidate previous sessions. The request message does not confirm whether an email is registered; check provider logs when delivery fails.

A verified sending domain is required for customer email delivery in production. The Resend test sender is limited to the account owner's recipient address. Removing signup confirmation does not remove the mail requirement for password recovery.

## 06. Catalog, search and editorial content
Inicio displays its six-image hero and product carousels in this order: Streaming (up to 10), ¡Personaliza a tu manera! (up to 20), Tienda (up to 10), Segunda (up to 10) and Cursos (up to 10, currently six supplied course records). Fewer available catalogue records produce fewer cards; the interface does not invent duplicates. Tienda and personalization rows follow the Tienda visibility switch; Segunda follows its own switch.

The personalization row alternates Vasos and Camisetas. The optional loader supplies ten cup designs and ten T-shirt designs: name, photo, phrase, pet, own artwork, anime style, couples, birthdays, gamer and company logo. These are editable sample listings with sample prices and zero initial stock. Personalization specifications, sizes, preparation and delivery must be coordinated with support; there is no customer artwork upload/configuration or shipping engine in checkout.

Home search covers name, category and description across the departments visible to that visitor. Digital catalogue filters include Todos, Streaming, Música, Productividad and Combos. Search and Todos are scoped to the current catalogue; they do not override disabled departments.

Tienda categories are Tecnología, Periféricos, Audio, Accesorios, Juguetes, Vasos and Camisetas, presented in a horizontal category carousel with swipe and arrows. Previous Computadores and Redes labels remain compatible through category aliases. Existing product records are retained, not replaced by actual toy inventory. Segunda contains Tecnología usada, Ropa usada and Calzado usado. The technology and used-goods seeds each supply 50 example products; verify names, stock, condition and prices before selling.

The six supplied courses are Aprende a activar office 365 x siempre; Aprende a Sacar cuentas Prime Video; Aprende a Sacar cuentas youtube; Aprende a generar tarjetas temporales; Aprende a generar ingresos extra; and Aprende a activar Windows. Titles are Spanish and editable. Course seeds create catalogue records, not lessons, videos, subscriptions or licences. Confirm legitimate materials, required licences, access conditions and delivery before enabling stock.

Historias que enganchan belongs to the Streaming experience, not Inicio. It provides platform tabs, horizontal scrolling and arrows for curated Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Paramount+, Crunchyroll, ViX and YouTube selections. Series and genre data are editorial, not live popularity rankings. ADMIN can replace their images.

All product cards retain zero-stock listings with Agotado, show positive quantities in green, and offer cart and Comprar ahora actions when saleable. Prices and buttons align within rows despite differing text lengths. Product/category ordering is controlled by ADMIN. Stock polling runs about every 15 seconds while the tab is visible and ordering mode is inactive; checkout validates server state again.

The home background changes every seven seconds while its text/actions remain fixed. Pause/reduced-motion controls are provided. Login has its own animated background, mascot and a successful-login welcome animation; the browser tab uses the goat face icon. The public brand is Goats.; technical repository paths and existing goat-* storage identifiers remain unchanged.

## 07. Cart, checkout and financial integrity
Comprar ahora opens a separate one-unit confirmation without consuming the existing cart. It uses its own checkout intent. Adding to cart supports multiple products/quantities. Guests are directed to authentication and returned to their intended purchase; charges require explicit checkout confirmation.

The cart stores product IDs and quantities in browser local storage under goat-cart-v3. It does not store authoritative prices or grant access to credentials. Duplicate rows are merged by product ID. The API accepts up to 50 distinct input rows and up to 50 aggregate units of an individual product, subject to inventory and balance.

Checkout displays processing state and prevents accidental concurrent submissions in the browser. Prices, quantities, section permissions, stock and balance are checked on the server. The browser's cached balance is informational and does not replace the database balance check.

| Stage | Server behavior |
|---|---|
| 1. Identify request | Authenticate user, validate cart and recover a matching saved checkout request |
| 2. Validate eligibility | Check client section switches, products, quantities and access availability |
| 3. Reserve inventory | Select individual streaming accesses and conditionally reduce stock |
| 4. Debit balance | Decrement balance only when enough funds exist |
| 5. Persist purchase | Create order, line snapshots, receipts, access assignments and WalletEvent |
| 6. Finish | Commit one transaction and return the order reference |

The transaction uses Serializable isolation with bounded retries for recognized conflicts. A rejected transaction leaves balance, stock and assignments unchanged. Order references use P followed by a sequence number, beginning with P1 for a new counter. Old references are preserved.

A checkout key is saved in session storage and linked to the completed order through CheckoutAttempt. Retrying the same user's same cart can recover that order without a second debit or another access assignment. A changed cart or another account cannot reuse the request as its own order. On a lost response, keep the cart unchanged, review Mis pedidos and retry the original request if needed; do not assume that a network error means payment failed.

## 08. Streaming inventory and private delivery
Streaming availability is derived from available StreamingAccess records, not a manually entered product quantity or the legacy Product.deliveryCipher. Each row has one platform/account/profile identity. productId is its primary product and productIds contains additional plan IDs. These are bindings to one unit, not copies. Sold/retired entries do not become available by changing a password, PIN or display label.

### Shared individual profiles
1. Sign in as ADMIN and open Perfil → Administración → Cuentas de streaming, or /administracion#cuentas-streaming.
2. In Una cuenta, varios planes, select individual-profile plans from one platform, for example Netflix x20, x28 and x33. Up to 20 distinct plans can be selected.
3. Enter one account identifier and its password in separate fields. The identifier accepts an email or digits only, up to 190 characters; outer spaces are removed and leading zeros are preserved. Store-user registration still requires an email.
4. Add from one to seven differently named/numbered profiles, each with an optional PIN. This is one account per submission, not a list of different email/password pairs.
5. Select Guardar cuenta y vincular planes and check the visible result. Errors appear in red beside Save and are scrolled/focused into view without clearing the rejected values.

Example: seven profiles linked to x20/x28/x33 show seven available on each plan, but only seven real accesses exist. If an x20 purchase receives profile 1, all three plans fall to six; profiles 2–7 remain. A cart containing different plans must receive different canonical profiles, and concurrent buyers cannot receive the same entry.

To link an existing unsold profile to more plans, submit its same identifier, profile, password and PIN. Existing entries are reused; mismatched credentials must be corrected in the inventory editor first. Sold or retired identities cannot be reintroduced.

### Whole accounts
Select a Streaming product named, for example, Prime Video cuenta completa. The form switches to one unit with the fixed profile Cuenta completa. Enter its email/numeric ID and password, with an optional PIN. Other linked products must be whole-account plans of the same platform. Adding another account is a separate submission.

A whole account cannot be registered simultaneously as independent individual profiles under the same platform/identifier. New writes check existing inventory and historical receipts in serializable transactions. Whole accounts remain excluded from combos. Review any legacy manually configured records before offering them as whole-account inventory; this update does not automatically convert old shared product credentials into new units.

### Individual editing and retirement
Editar producto → Inventario privado de streaming remains available for individual entries and whole-account units. ADMIN sees counts and the first 100 available records. A profile's identifier/platform/profile identity is immutable in the editor; available entries can have heading, password or PIN corrected. Corrections to a shared row apply to that row in all its plans, while saved receipts remain unchanged.

Retirar retires a profile from every linked plan. Agotar on a product removes its available shared bindings without emptying the other plans; an access with no remaining plan is retired. Retired and sold entries retain their reserved identity. There is no automatic renewal, recycling or expiry-based restocking.

### Combos
Configure a combo's quantity and price without copying credentials into it. Recognized examples include Combo x2: Netflix + Prime Video and Combo x3: Netflix + Prime Video + Paramount. Each sold combo consumes one eligible individual profile for each platform, as well as one configured combo unit. Netflix sources must offer x28 días and full accounts are excluded. A profile primarily stored under x20 can supply a combo only when it is also linked to an eligible x28 plan.

Available combo stock is the minimum of configured combo quantity and every required platform pool. Ten configured combos with seven Netflix and four Prime profiles show four available. If Netflix is unavailable, Prime alone cannot complete the purchase: the whole transaction fails without charging or reserving part of the combo. Seller combos use their owner's eligible sources; general/ADMIN combos can use store inventory. All single-plan and combo selections share one exclusion set within checkout.

## 09. Orders, receipts and profile dashboard
After checkout, the customer is taken to Pedidos and a centered receipt dialog opens for the completed order. Closing it does not delete the order or receipt. Receipts remain available in the owning buyer's private order history and authorized ADMIN order detail. A customer's guessed order ID does not grant access to another account's receipt.

| Receipt content | Meaning |
|---|---|
| Heading and platform | Administrator-configured heading and purchased product name |
| Email/numeric ID, password, profile, PIN | Assigned platform access at purchase time |
| Reference and date | Saved order reference and purchase time |
| Quantity and amount | Unit or line information according to delivery type |
| Usage notice | Instruction not to change platform account/profile data |

Receipt text is encrypted as an immutable purchase snapshot. Later price or credential changes do not rewrite previous receipts. Asterisks used for emphasis render as bold text; the viewer does not interpret arbitrary HTML. A receipt is an access-delivery record, not an integrated electronic tax invoice.

Orders with configured delivery for every line receive ENTREGADO. Physical/manual or mixed orders can remain PENDIENTE_ENTREGA. ADMIN can change delivery status in the sales panel. It does not implement cancellation, refund, shipping or financial reversal workflows.

History supports 20 orders per page, department filters and grouped line subtotals for mixed orders. The summary API returns a bounded recent list; the private history page supplies the full paginated view. Dates in account/receipt presentation use America/Bogota. Monetary amounts are integer COP values.

Perfil shows name, email, role, balance, total recorded spending, registration date, order count and up to ten recent purchased products. Seller/admin profiles can also show recent sales according to ownership rules. Spending is the sum of recorded purchases and is not adjusted by a refund subsystem because that subsystem does not exist.

## 10. Administrator operating procedures
Open the profile circle → Administración to reach /administracion/ventas. Operating shortcuts lead to products/inventory, Cuentas de streaming, clients, recharges, section settings and images. /administracion is the catalogue workspace. Every administrative page and mutation checks ADMIN server-side.

### Sales and clients
The sales dashboard shows total recorded sales, order count, units and pending deliveries. Search supports order/reference, buyer name/email and product name; filters include delivery status, category and Bogotá date range. Results are paginated at 20 orders. Filters select complete orders, so totals include all lines of a matching mixed order. Sales totals are not profit.

Order detail includes buyer identity, registration date, current balance, historical lines/prices and private saved receipts. The delivery control switches ENTREGADO/PENDIENTE_ENTREGA with expected-status conflict checking. It does not charge, refund, restore stock, recycle access or change the financial ledger.

CSV export follows the filters, uses one row per order line, contains no platform passwords/PINs/receipt ciphertext and neutralizes spreadsheet-formula prefixes. It is limited to 1,000 orders; narrow the filters if that limit is exceeded. Customer names/emails remain personal data and require controlled handling.

Clientes supports search and 25 users per page, showing role, join date, balance, purchase count and recorded spending. It shows the latest 20 matching RECARGA events and provides history/recharge shortcuts. Recharges are administrative credits, not bank confirmations: verify the external payment before recording one. The API accepts positive integer amounts up to COP 10,000,000 and records the administrator reference in the wallet note. No automatic seller commission/settlement is implemented.

### Catalogue operations
| Task | Procedure and result |
|---|---|
| Price/name/description | Editar → change values → Guardar producto; historical order lines stay unchanged |
| Duplicate | Duplicar immediately creates and opens an independent copy with zero stock |
| Shared streaming | Cuentas de streaming → select same-platform/same-mode plans → save account/accesses |
| Individual inventory | Editar producto → Inventario privado de streaming |
| Other stock | Enter real quantity; refresh on expected-stock conflict |
| Mark sold out | Agotar zeroes manual stock or detaches/retires available streaming bindings |
| Enable departments | Secciones disponibles para clientes → Tienda/Segunda independently |
| Reorder | Ordenar tarjetas near the top of the desired catalogue; drag or use arrows; Terminar de ordenar |
| Course listings | Cursos → Cargar / actualizar cursos |
| Personalization listings | Cargar / añadir productos personalizados in Inicio, Tienda or administration |
| Existing image compression | Administration workspace → Comprimir imágenes existentes |

Card moves save automatically for all visitors. Ordering applies globally, including home rows; personalization preserves its cup/T-shirt alternation. Concurrent order edits carry a version; refresh on conflict. On touch devices use the arrow controls.

Duplication copies public catalogue fields and the current custom image independently, but no credentials, access inventory, order associations or wallet records. The creator owns the copy. ADMIN may duplicate any product; VENDEDOR only owned products. Closing the editor does not undo the already-created copy.

Course/personalization loaders preserve existing IDs, prices, stock and administrator customizations; supported untouched older sample course names can be updated. Personalized loaders supply 20 records; course loaders supply six. Samples begin with zero stock. They do not deliver lessons, generate accounts or manufacture products.

Tienda/Segunda switches default to enabled if no settings row exists. For guests/CLIENTE they hide navigation and affected home rows, exclude catalogue products and block checkout of disabled items. ADMIN/VENDEDOR keep access. Historical purchases remain visible.

## 11. Images, branding and interface maintenance
The visible brand is Goats. with purple/plum accents, rounded search and the goat face favicon. Technical paths, existing storage keys and the repository name remain compatible with earlier releases. ADMIN can replace six hero backgrounds, product/category images and editorial series/platform images.

JPEG, PNG, WebP and AVIF uploads are supported up to 2 MB per selected file. The server checks actual byte count, declared type and signature; uploaded SVG/HTML is rejected. The optimizer limits decoded input to 40 million pixels. Built-in SVG illustrations remain version-controlled static assets.

| Asset | Storage / operating control |
|---|---|
| Six backgrounds | BannerImage; banner upload/restore controls |
| Product/category/series/platform overrides | CatalogImageAsset; corresponding ADMIN image controls |
| Built-in images and favicon | public/images and app/icon.svg; repository deployment |

Database images survive deployments when the same database/records are preserved. A local file path is not a public image URL: upload the file or commit a suitable static asset. Image GET endpoints are public; they use ETags and private revalidation. Private streaming credentials are never image metadata.

### Automatic compression
New uploads are optimized server-side with Sharp. Large inputs may first be resized in the browser. The server corrects orientation, preserves alpha, removes original metadata and compares AVIF quality 45 with WebP quality 65, choosing the smaller encoding. The stored image is replaced only if the candidate is more than 5% smaller; small originals stay unchanged. Supported animated images and files already marked as optimized are retained to avoid breaking animation or accumulating lossy degradation.

| Image use | Maximum long edge for the resized candidate |
|---|---|
| Product | 900 px |
| Category or series | 700 px |
| Platform logo | 128 px |
| Home banner | 1600 px |

Compression is lossy, and savings depend on the source. There is no guarantee of a fixed percentage or of mathematically minimal size. Retain source originals externally if future editing/restoration requires them. Banner composition is approximately 1600 × 700; check text/logo readability on mobile and desktop.

### Optimize existing uploads
1. Enter /administracion as ADMIN and find Optimizar imágenes.
2. Select Comprimir imágenes existentes and keep the tab open.
3. The tool processes one stored image per request, reports progress, changed count and byte savings, and preserves smaller/already-optimized versions.
4. Review any failures and retry if needed. A concurrent upload/deletion is protected by updatedAt matching and is not overwritten.


## 12. Architecture and repository organization
Goats Store is a Next.js App Router application using React and TypeScript. Server route handlers enforce identity, permissions, validation and financial operations. Prisma accesses PostgreSQL. Customer state in the browser improves the interface but is never the authority for balance, price or access assignment.

| Layer | Responsibilities and implementation |
|---|---|
| Browser | React screens, cart storage, filters, animations and administrator interactions |
| Next.js server | Pages, route handlers, sessions, authorization and input validation |
| Business services | Inventory allocation, receipts, account history, catalog ordering and migration |
| PostgreSQL | Users, products, stock, orders, wallet events, private inventory and uploaded images |
| Optional email | Resend for password reset, not signup |
| External contact | WhatsApp deep links; no automatic outbound support messages |

The principal dependencies are Next.js 15, React 19, Prisma 6, Zod 4, bcryptjs, jose, lucide-react and Sharp; exact installed versions are pinned by package-lock.json. package.json specifies compatible version ranges. Use a supported Node.js release compatible with the dependencies; the Sharp dependency requires Node.js 20.9 or newer. Use a currently supported Node.js LTS release meeting all dependency requirements.

| Directory/file | Maintenance responsibility |
|---|---|
| app/ | Pages, metadata, API endpoints and global CSS |
| components/ | Access, storefront, profile menu, images, receipts and inventory editor |
| lib/ | Authentication, security, catalog, checkout helpers and migration logic |
| prisma/schema.prisma | Authoritative application data model |
| prisma/seed*.ts | Administrator initialization and sample catalogs |
| scripts/ | Email checks and database migration entry point |
| tests/ | Unit and isolated PostgreSQL integration tests |
| public/ | Version-controlled static visual assets |
| .env / .env.migration | Private local runtime/migration configuration; not committed |

## 13. Data model and record relationships
The schema has 15 application models. Identifiers are generally strings; BannerImage uses a numeric slot. COP amounts are integers. PostgreSQL constraints provide email uniqueness, access identity uniqueness and relationships between records. See Appendix A for the field inventory.

| Relationship | Business meaning |
|---|---|
| User → Product | Optional seller/owner of a product |
| User → Order → OrderItem | Buyer, purchase and immutable line details |
| Product → StreamingAccess | Primary product for an access; productIds adds shared-plan bindings without duplicating the unit |
| OrderItem → StreamingAccess | Which sold accesses fulfilled the purchase line |
| Order → CheckoutAttempt | Recovery of an idempotent checkout request |
| User → WalletEvent | Recorded recharges and purchase debits |
| User → PasswordReset | Temporary one-use reset authorizations |

Product.description, price and credential configuration can change; OrderItem stores the name, unit price, quantity, category and seller reference recorded at purchase. Receipt ciphertext preserves delivered content separately. This distinction is essential when troubleshooting a customer's past purchase.

StreamingAccess.productIds is a PostgreSQL string array with a GIN index. Queries count a canonical row once for each linked plan. It is a logical binding list, not a Prisma foreign-key relation for each additional ID; approved administrative mutations validate products and synchronize stock.

BannerImage and CatalogImageAsset store binary image data in PostgreSQL and must be included in backups. CatalogOrder stores JSON ID ordering plus a version. StoreSettings stores client visibility flags. RateLimit stores expiring authentication counters; it is operational state, not a financial ledger.

PendingRegistration is retained only for compatibility with old data and the migration tool. It is not an active registration queue. A database table's presence does not imply that the related former feature remains enabled.

## 14. Security controls and their limits
Passwords are hashed with bcrypt at cost 12. JWT sessions use HS256, expire after seven days and are carried in the goat_session cookie with HttpOnly and SameSite=Lax; Secure is enabled in production. Server requests compare the token's session version with the current User record. Password reset and administrator password reseeding invalidate prior sessions through sessionVersion.

Private delivery and receipt content uses AES-256-GCM with authenticated encryption and random initialization data. The key is derived from DELIVERY_SECRET, or AUTH_SECRET when DELIVERY_SECRET is absent. Streaming identity fingerprints use a keyed HMAC. Preserve the original active secrets with the corresponding database backup. Changing or adding a delivery secret after data exists is not a supported key rotation procedure and can make existing records unreadable.

JSON mutations enforce an approximately 16 KiB body limit, origin validation and content-type checks. Image uploads have their separate 2 MB limit. Same-origin addresses and exact Vercel system-provided aliases are allowed; unrelated vercel.app projects are not wildcard-authorized. Cross-site Fetch Metadata requests are rejected. APP_URL remains the canonical base for reset-email links.

Authentication throttling is database-backed: login and reset allow 20 attempts per action/identity per 15-minute window; registration and forgot-password allow five. A shared authentication ceiling is 1,000 per window. HTTP 429 indicates throttling. These fixed windows do not replace hosting firewall or abuse controls.

Responses include anti-framing, MIME-sniffing and referrer protections, a restricted-object/form/frame CSP and production HSTS. The CSP is not a complete nonce-based script policy. The implementation does not constitute a penetration test, compliance certification, MFA system or comprehensive security monitoring service.

## 15. Environment configuration and database choice
A database connection string is not an email API key. PostgreSQL connections start with postgres:// or postgresql://. Resend API keys typically start with re_. Never place actual values in documentation, source control, screenshots or support messages.

| Variable | Purpose and operating rule |
|---|---|
| DATABASE_URL | PostgreSQL database used by that runtime; preserve required TLS parameters |
| AUTH_SECRET | Required session secret, minimum 32 characters; also encryption fallback |
| DELIVERY_SECRET | Optional separate delivery/HMAC secret; preserve the original effective key |
| APP_URL | Canonical HTTPS origin in production; local HTTP is allowed for localhost |
| RESEND_API_KEY | Optional for signup; required for password-reset delivery |
| EMAIL_FROM | Authorized sender on a verified domain for customer password resets |
| ADMIN_EMAIL | Private bootstrap administrator email for seed execution |
| ADMIN_PASSWORD | Private seed password; minimum 12 characters, maximum 72 UTF-8 bytes |
| SOURCE_DATABASE_URL | Supabase source for the one-time migration utility |
| TARGET_DATABASE_URL | Empty Neon destination for that migration utility |

Supabase and Neon are alternatives for the PostgreSQL layer. The application does not require both. Supabase Auth and Storage are not the app's authentication/image systems. A deployment can use Supabase directly; choose a compatible direct or session-pooler connection for the runtime.

Local development reads local .env; Vercel reads its configured environment variables. If the two URLs point to different databases, users, balances, stock and orders are separate. Sharing one database also shares the impact of local changes. Use separate development/test data where possible.

The project uses goats.win as its public domain and Vercel + Neon for its deployment workflow. Actual provider configuration, secret values, current DNS and active deployment must be checked in their dashboards; this source review is not a live infrastructure audit.

## 16. Local installation and administrator bootstrap
Clone/open the repository, select the intended branch and install its lockfile-defined dependencies. Create .env from .env.example and supply PostgreSQL access and secrets privately. Apply the schema only to the intended database. db:push creates or updates structure; it does not migrate Supabase records into Neon.

```sh
npm install
npx prisma generate
npm run db:push
npm run dev
```

For a fresh database that should receive a bootstrap administrator and sample digital catalog, set ADMIN_EMAIL and ADMIN_PASSWORD, then use an environment-aware seed command:

```sh
node --env-file=.env --import tsx prisma/seed.ts
```

The administrator seed refuses to promote an existing non-admin email. Running it for an existing administrator updates the password and increments sessionVersion. It adds missing sample products without duplicating matching store-owned names. Do not run it before migrating into an empty target: the migration refuses a destination containing store records.

Optional sample catalogues use npm run db:seed:technology, npm run db:seed:secondhand, npm run db:seed:courses and npm run db:seed:personalized. The last two also have ADMIN interface controls. Do not treat example product quantities or descriptions as verified commercial inventory.

For a local production-style run, execute npm run build followed by npm run start. Development mode compiles pages on demand and is not a representative production performance measurement. Never commit .env, its connection strings or administrator credentials.

## 17. Vercel deployment and domain operation
The maintained source branch is password-reset. Confirm the actual source commit in Vercel: redeploying an old execution does not pull new source. The project's public domain is https://goats.win; inspect provider dashboards for current DNS, certificate, environment and branch settings rather than assuming the manual verifies their live state.

1. Import cabr444/Goat_Store, select the intended branch, Next.js preset, root ./ and npm run build.
2. Configure Production/Preview variables privately. DATABASE_URL must select the intended PostgreSQL database; APP_URL should be the canonical HTTPS origin.
3. Back up relevant data and apply reviewed schema changes before exposing code that requires them. In particular, shared profiles require StreamingAccess.productIds and its GIN index.
4. Run relevant checks, push the release, wait for Ready and verify the deployment commit.
5. Test anonymous browsing/cart, login, admin controls, a controlled purchase, cross-plan stock and private receipt access.

Schema commands may run from the VS Code terminal on the owner's PC. They update whichever online database DATABASE_URL selects; running locally does not mean the database is local. With the intended Neon connection configured privately in .env, use:

```sh
git switch password-reset
git pull origin password-reset
npm install
npm run db:push
```

This synchronizes structure, not records. npm run build generates Prisma Client but does not apply the database schema. Changing a local .env does not update Vercel environment variables. A schema update alone generally needs a page refresh, while changed Vercel variables require a new deployment. Keep the original encryption secrets.

### Domain and discovery
Add goats.win and the desired www alias in the project's Domains area. At Cloudflare DNS, use the exact record/target Vercel supplies and DNS only when requested; do not copy an obsolete IP from an example. Wait for valid configuration and the HTTPS certificate. Connecting a domain itself does not require rebuilding the app; changing APP_URL does require redeploying its environment configuration. Website SSL and email-sender authorization are independent.

Vercel hosts the app, PostgreSQL hosts data and Cloudflare registers/manages the domain/DNS. The public site does not depend on the owner's PC staying on. Check deployment protection for guest access, renewal settings, provider usage and hosting terms suitable for commercial activity. No capacity/load or one-year free-hosting guarantee is established by this documentation.

Public catalogue pages allow discovery, but a domain alone does not guarantee Google indexing or ranking for “goats”. Search Console verification, sitemap/robots work, useful unique descriptions and external discovery require separate implementation/configuration. This source baseline has no implemented sitemap/robots route; do not report them as already submitted.

## 18. Supabase-to-Neon data migration
The repository includes a one-time application-data copier for an empty Neon destination. It copies records, unlike db:push. Users retain their bcrypt hashes and balances; products, orders, wallet events, uploaded images, configuration, private inventory and encrypted receipt snapshots are included. Supabase-internal Auth/Storage/roles are outside the app-data scope. Destination RateLimit counters remain local and source counters are not imported.

Before copying, back up the source, stop writes to the old store/local server and keep the original effective encryption secrets. Verify that the Neon target is the database used by Vercel. Do not create accounts or run seed in the target first. This tool is not a merge utility for two active stores.

Create private .env.migration from .env.migration.example:

```env
SOURCE_DATABASE_URL="<Supabase PostgreSQL connection>"
TARGET_DATABASE_URL="<empty Neon PostgreSQL connection>"
```

Keep DATABASE_URL in .env pointing to the target for schema updates, then run:

```sh
npm run db:push
npm run db:migrate:check
npm run db:migrate:apply
```

Check mode reads without writing. Apply mode repeats the empty-target check, locks its application tables, copies in one target transaction and verifies counts and content checksums. Supabase is read through a read-only snapshot. Recognized newer tables absent from an older source remain empty; supported new fields can receive their defaults. The order counter is repaired when required to avoid repeating existing P references.

An error during copying aborts the target transaction. If a connection is lost at commit, inspect Neon before assuming rollback or trying again. A nonempty destination is refused rather than cleared. If Neon already has business records, plan a separate reconciliation/merge. Direct database connections are preferred; a Supabase session pooler can be used where direct IPv6 access is unavailable.

## 19. Operations, backups and incident handling
The application does not create scheduled database backups itself. Configure backups or point-in-time recovery through the chosen PostgreSQL provider and test restoration to a separate environment. A useful restore requires both the database data and the original encryption secrets. Hosting redeployment does not restore database records.

| Frequency | Operating activity |
|---|---|
| Before opening sales | Check public login, canonical domain, real product prices and streaming inventory |
| During daily operation | Review failed requests, balance/recharge events, available profiles and support messages |
| Before a release | Back up data, verify branch/commit, review schema changes and run appropriate tests |
| After a release | Verify signup/login, disabled-section behavior, checkout, receipts and images |
| Periodically | Test restoration, review permissions, dependencies, sender status and secret handling |

During a purchase complaint, first locate the order and WalletEvent. A checkout network error can occur after a successful commit. Verify the saved order before adding a manual credit or asking the customer to buy again. Use the original checkout recovery flow where possible.

If an encryption key is lost or changed accidentally, restore the original effective key before modifying records. Do not replace encrypted content with guessed values. If a credential or database password was exposed, revoke/rotate the exposed external credential and coordinate application changes; encryption-key rotation requires a separate data-reencryption plan.

For an outage, identify whether the failure is deployment/build, database connectivity/schema, origin validation, authorization, throttling, inventory or email. Collect redacted runtime logs, time, route and deployment commit. Do not collect customer passwords or private streaming credentials through screenshots.

## 20. Testing, troubleshooting and known limits
Use npm test, npx tsc --noEmit and npm run build for unit, type and production-compilation checks. Prior implementation work also exercised isolated PostgreSQL and browser tests for shared profiles, whole accounts, numeric identifiers, combos, guest checkout, image optimization and administrative workflows. This documentation refresh does not independently certify production state or repeat a load/security audit.

Integration fixtures must run only against disposable local databases and a matching local server. The shared/streaming/combos suites use goat_inventory_test, DATABASE_URL, AUTH_SECRET and the appropriate test URL. Migration tests use separate disposable source/target databases. Do not point these fixtures at customers' Neon records.

| Symptom | Investigation / action |
|---|---|
| NEXT_NO_VERSION | Check branch, commit, root ./ and Next.js in package.json |
| Empty JSON / Unexpected end of JSON input | Inspect response status and redacted server logs; the catalogue may be failing after login rather than rejecting credentials |
| Falta actualizar el esquema de la base de datos | Pull current code and run db:push against the exact Neon database Vercel uses; verify productIds exists |
| Catalogue temporarily unavailable | Check database connectivity/schema and current deployment; public requests receive generic errors while ADMIN gets actionable missing-schema guidance |
| Solicitud no autorizada | Verify origin, APP_URL, deployment aliases and current revision |
| Invalid email or numeric ID | Use one valid email or digits only; place its password separately; do not paste multiple accounts into one field |
| Duplicate profiles / invalid PIN | Use distinct profile names/numbers; PIN is optional and at most 40 characters; inspect the red focused error beside Save |
| Full account rejected | Use a current deployment, a product named cuenta completa/full, one access, and only same-platform whole-account plans |
| Account already sold/retired or mixed mode | Review the existing inventory; credentials or another profile label cannot recycle a reserved identity or split a whole account into profiles |
| Streaming / combo sold out | Replenish eligible unsold access inventory; every combo platform must be available, including Netflix x28 |
| Correo o contraseña incorrectos | Verify the user exists in the active database; use recovery instead of editing passwordHash |
| Password-reset sender unauthorized | Check Resend verified sending domain and EMAIL_FROM; signup itself sends no confirmation |
| Stock/status/order conflict | Reload the current version; inspect committed order and wallet records before repeating an operation |
| Images rejected | Check supported signature/type, 2 MB size, decoded dimensions and ADMIN permissions |
| New feature missing | Verify deployment commit/Ready and refresh; a local commit is not published until its push/deployment succeeds |

Limits include open seller signup and no application MFA, automatic payments/refunds, seller payouts, shipping, course hosting, artwork configurator or profile recycling. Public browsing and manual delivery status are implemented. Indexing, load capacity and provider retention require separate verification.

## 21. Maintenance and documentation governance
Treat the repository schema and implementation as the technical source of truth. Update this manual when a release changes a route, permission, form, inventory rule, environment variable, migration requirement or operator procedure. Update the English and Spanish editions together.

| Change class | Documentation to review |
|---|---|
| Registration/authentication | Customer guide, security, endpoint reference and mail requirements |
| Product or streaming rules | Admin procedures, checkout, data dictionary and tests |
| Financial processing | Wallet/order semantics, support runbook and limitations |
| Hosting/database | Configuration, deployment, migration and incident procedures |
| Schema/API | Appendices, validation, compatibility and backups |

Use document version 1.0 as the initial baseline. Increment the revision, record the source commit and review date, describe the change and retain the previous approved edition. Editing the Word file is supported; for consistent regeneration, transfer final changes into the Markdown master as well.

The source package contains both Markdown editions and a Python DOCX builder. Generation is an optional documentation task, separate from npm build and application runtime. No deployment or customer-data modification is required just to revise this manual.

## Appendix A. Data dictionary
Fields below describe the current schema. A question mark means nullable; bracket notation indicates a relation collection. The main relationships are summarized in section 13.

| Model | Main stored fields | Purpose |
|---|---|---|
| User | id, email (unique), name, passwordHash, role, balance, sessionVersion, createdAt | Identity, permissions and prepaid balance |
| Product | id, name, category, price, description, mark, gradient, active, stock, ownerId?, deliveryCipher?, createdAt | Catalog and legacy non-streaming delivery configuration |
| OrderCounter | id, value | Sequential order reference allocation |
| Order | id, reference? (unique), userId, total, status, createdAt | Purchase header |
| OrderItem | id, orderId, productId, name, category, sellerId?, quantity, unitPrice, receiptCipher? | Purchase line and encrypted delivery snapshot |
| WalletEvent | id, userId, amount, type, note, createdAt | Recharge/debit record |
| PasswordReset | tokenHash (primary key), userId, expiresAt, createdAt | One-use reset authorization |
| BannerImage | slot (primary key), data (bytes), contentType, updatedAt | Six database-hosted hero overrides |
| RateLimit | key (primary key), count, expiresAt | Expiring authentication counters |
| CatalogImageAsset | key (primary key), data (bytes), contentType, updatedAt | Product/category/editorial images |
| StoreSettings | id, tiendaEnabled, segundaEnabled | Client department switches |
| CatalogOrder | kind (primary key), ids (JSON), version | Shared display order and conflict detection |
| PendingRegistration | email (primary key), name, passwordHash, role, tokenHash (unique), statusHash (unique), createdAt, expiresAt, confirmedAt? | Historical confirmation data; inactive workflow |
| CheckoutAttempt | key (primary key), orderId (unique) | Idempotent checkout recovery |
| StreamingAccess | id, productId, productIds[] (GIN), fingerprint (unique), platform, cipher, createdAt, version, soldAt?, retiredAt?, orderItemId? | One-time profile or whole-account unit with optional shared-plan bindings |

Available StreamingAccess entries have soldAt and retiredAt both null. Sold entries have an order-line association; retired entries remain reserved identities. Stock shown publicly is computed from available inventory for Streaming. A Product.active field exists, but the current sold-out operation intentionally keeps the product visible with zero available stock rather than acting as a general publication toggle.

## Appendix B. API reference
All paths are relative to the application origin. JSON is required for ordinary mutations; image uploads use their supported binary media type. The body limit and role checks still apply where relevant. This reference is a map of the implementation, not a substitute for per-route validation.

| Method and endpoint | Authorization | Purpose / important input |
|---|---|---|
| POST /api/auth/register | Public, rate-limited | name, email, password, role; creates account, HTTP 201 |
| POST /api/auth/login | Public, rate-limited | email, password; session cookie on success |
| POST /api/auth/logout | Session-related | Clear session cookie |
| POST /api/auth/forgot-password | Public, rate-limited | email; request password-reset message |
| POST /api/auth/reset-password | Public, valid reset token | token, password; consume token and invalidate sessions |
| POST /api/auth/verify-email | Retired | HTTP 410; no account creation |
| POST /api/auth/resend-verification | Retired | HTTP 410; no confirmation mail |
| POST /api/auth/registration-status | Retired | HTTP 410; former pending flow disabled |
| GET /api/me | Public | Current user or null |
| GET /api/storefront | Public | Permitted products/settings/order; guest user null, no private orders/users; ADMIN user list only |
| GET /api/products | Public | Permitted public product fields and settings |
| POST /api/products | ADMIN / VENDEDOR | Create validated product with current user ownership |
| PATCH /api/products/[id] | ADMIN / owning VENDEDOR | Product values and expectedStock; guarded update |
| POST /api/products/[id]/duplicate | ADMIN / owning VENDEDOR | Create independent catalog/image copy with zero stock and no private delivery data |
| DELETE /api/products/[id] | ADMIN / owning VENDEDOR | Mark sold out; detach shared bindings and retire accesses with no remaining plans |
| GET /api/orders | Authenticated | Latest 50 own orders with safe line information |
| POST /api/orders | Authenticated | items[{id,qty}], optional checkoutKey; transactional purchase/recovery |
| GET /api/admin/users | ADMIN | User identity, role and balance list |
| POST /api/admin/recharge | ADMIN | userId, amount, note; recorded administrative credit |
| GET, PUT /api/admin/store-options | ADMIN | Read settings; update department and enabled |
| PUT /api/admin/card-order | ADMIN | kind, id, target, position, version |
| GET, PUT /api/admin/products/[id]/delivery | ADMIN | Legacy digital delivery fields; PUT rejected for Streaming |
| GET /api/admin/products/[id]/inventory | ADMIN | Available entries, counts, platform and legacy indicator |
| POST, PATCH, DELETE /api/admin/products/[id]/inventory | ADMIN | Add/edit/retire profile or whole-account units; immutable identities and version checks |
| GET /api/banners | Public | Banner override metadata |
| GET /api/banners/[slot] | Public | Image bytes; private ETag revalidation |
| POST, DELETE /api/banners/[slot] | ADMIN | Upload or remove one hero override |
| GET /api/catalog-images | Public | Catalog image metadata |
| GET /api/catalog-images/file | Public | Image bytes for logical key |
| POST, DELETE /api/admin/images | ADMIN | Upload/remove category, product, series or platform image |
| POST /api/admin/streaming-accounts | ADMIN | productIds, account{brand,email,password}, profiles[{profile,pin}]; shared individual profiles or one whole account |
| POST /api/admin/courses/seed | ADMIN | Add missing course listings and supported untouched sample updates |
| POST /api/admin/personalized/seed | ADMIN | Add missing personalized cups/T-shirts without overwriting existing records |
| GET /api/admin/images/optimize | ADMIN | List stored catalogue/banner image identifiers |
| POST /api/admin/images/optimize | ADMIN | type: catalog/banner, id; optimize one stored image with concurrent-change protection |
| GET /api/admin/sales/export | ADMIN | Filtered CSV, maximum 1,000 orders, no platform credentials |
| PATCH /api/admin/orders/[id]/status | ADMIN | expectedStatus and status; manual delivery status only |

Important responses include 400 for validation/business rejection, 401 for unauthenticated access or invalid login, 403 for authorization/origin denial, 409 for conflicts, 410 for retired confirmation flows, 413/415 for size/type rejection, 429 for throttling and 503 for temporary processing failure. New orders return 201; a recovered matching checkout can return 200. The private profile/order pages, not the public product payload, expose the owning buyer's decrypted receipts.

## Appendix C. Commands, release checklist and glossary
| Command | Purpose |
|---|---|
| npm install | Install project dependencies |
| npm run dev | Local development server |
| npm run build | Generate Prisma client and production Next.js build |
| npm run start | Serve the built application |
| npm run db:push | Synchronize schema; not a data transfer |
| node --env-file=.env --import tsx prisma/seed.ts | Initialize/reset configured admin and add missing sample digital products |
| npm run db:seed:technology | Add technology sample catalog |
| npm run db:seed:secondhand | Add used-goods sample catalog |
| npm run db:studio | Open Prisma Studio; sensitive database access |
| npm run email:check | Check password-reset mail configuration without sending mail |
| npm run db:migrate:check | Read-only migration preflight with private migration variables |
| npm run db:migrate:apply | Copy into an empty target and verify |
| npm test / npx tsc --noEmit | Unit checks / TypeScript validation |
| npm run test:inventory / npm run test:streaming | Isolated inventory/allocation integration tests |
| npm run test:duplicate | Isolated product-copy, ownership, image and rollback checks |
| npm run test:migration | Disposable two-database migration tests |
| npm run db:seed:courses | Load six editable course listings |
| npm run db:seed:personalized | Load 20 editable personalized products |
| npm run test:courses | Isolated course catalogue/purchase tests |
| npm run test:combos | Eligible pools, allocation, concurrency and rollback |
| npm run test:guests | Public browsing, cart/auth return and visibility controls |
| npm run test:admin | Sales/client tools, CSV privacy, status conflicts |
| npm run test:shared-streaming | Shared profiles, numeric IDs, whole accounts and concurrent purchases |
| python scripts/build-documentation.py --output-dir docs/exports | Regenerate both editable Word editions and their source ZIP |

Release checklist: confirm branch/commit; protect database/secrets; apply only reviewed schema changes; configure environment and mail where needed; run relevant checks; wait for Ready; verify correct public domain; test a customer journey; confirm hidden sections; inspect private receipt access and monitor redacted logs.

### Glossary and revision history
Glossary: COP is Colombian peso; saldo is the internal prepaid balance; pedido is an order; perfil is the account dashboard or platform profile depending on context; agotado means sold out; checkout key identifies one retryable purchase intent; ciphertext is encrypted content; a provider connection string selects a database, while an API key authorizes a service.

Revision record: 1.0 — 17 October 2026 — Initial English edition based on source 42fd1ce; includes direct signup, individual streaming inventory, migration tooling and account-navigation visibility fixes. Update this entry and the Spanish edition when behavior changes.


1.1 — 18 October 2026 — Updated to source 56f7f83: product duplication, independent image copying, zero-stock/private-data safeguards, ownership permissions and mobile editor guidance.

2.0 — 26 October 2026 — Source 22cd272: Goats branding/domain, public shopping, courses/personalization, admin sales/clients, direct purchase, shared profiles, full accounts, numeric identifiers, combo allocation, AVIF/compression and schema/validation troubleshooting.
