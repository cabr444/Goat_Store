# Goat Store
## 01. Document control and purpose
This manual describes Goat Store as implemented in source revision 56f7f83 on the password-reset branch. It is an operational and technical reference for the business owner, administrators, support staff, developers and deployment operators. Application package version: 2.0.0. Documentation version: 1.1. Review date: 18 October 2026.

The document distinguishes implemented behavior from operating recommendations and future work. It does not assert that a particular production database, mail sender, domain or backup policy has been configured. Those settings must be verified in the relevant provider dashboards. No customer records, passwords, connection strings or API keys are included.

| Control | Value |
|---|---|
| Repository | github.com/cabr444/Goat_Store |
| Source baseline | password-reset / 56f7f83 |
| Document owner | Goat Store project administrator |
| Intended use | Administration, support, deployment and maintenance |
| Master formats | Editable Word document and versioned Markdown source |
| Review triggers | Changes to workflows, permissions, schema, dependencies or hosting |

The Word file can be edited in Microsoft Word, LibreOffice Writer or an application supporting DOCX. For reproducible updates, edit the corresponding Markdown source, update the revision record and regenerate the document. Screens, policies and production settings may change after this baseline.

## 02. Executive overview and scope
Goat Store is a Spanish-language web storefront for streaming plans and other digital products, with optional technology and second-hand catalogs. Customers use a prepaid internal balance in Colombian pesos (COP). Administrators manage catalog content, streaming access inventory, customer recharges, images, display order and client access to optional sections.

The current business priority is streaming sales. Technology products in Tienda and used goods in Segunda remain implemented modules that can be disabled for CLIENTE accounts. Disabling them does not delete products, hide historical purchases or remove administrator and seller access.

The central streaming safeguard is individual access inventory. A unit sold from a Streaming product receives one available account/profile entry. That entry is assigned to the order and cannot be sold a second time. Multi-unit orders receive separate assigned accesses. A receipt records the access details used at purchase rather than looking up mutable product credentials later.

Registration is immediate and does not require email confirmation or a Resend account. Password recovery is a separate email-based service. The application is deployed independently from the developer's computer; only local development depends on that computer remaining on.

Implemented modules include authentication, catalog filtering, streaming editorial shelves, a persistent cart, transactional checkout, customer profile and order history, administrator content tools, role-based permissions and an application-data migration utility. Automated banking, refunds, shipping integrations and seller payouts are not implemented.

## 03. Roles and permission model
Permissions are checked on the server. Hiding a button is a user-interface measure; it does not replace the corresponding API authorization check. ADMIN is created privately through the seed process and cannot be selected during public signup. CLIENTE and VENDEDOR can be selected at signup.

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
The storefront provides Inicio, Streaming, Combos and optional Tienda and Segunda entry points, alongside contact and account functions. The removed Productos and Beneficios menu sections are not part of the current home navigation. Catalog pages and the home storefront currently require login; this is not yet an anonymously browsable SEO catalog.

| Route | Purpose and access |
|---|---|
| /acceso | Login, direct registration and password recovery entry |
| / | Authenticated home with hero, editorial shelves and digital plan filters |
| /catalogo | Authenticated digital catalog; category and platform query filters |
| /store | Technology catalog; redirects clients when disabled |
| /segunda | Second-hand catalog; redirects clients when disabled |
| /perfil | Authenticated profile, balance, spending and recent activity |
| /pedidos | Private paginated order history and receipts |
| /administracion | Administrator-only catalog and operating controls |
| /restablecer-contrasena | Reset form reached through an email token |
| /confirmar-correo | Compatibility notice; confirmation is no longer required |

The profile circle beside the balance opens Perfil, Pedidos, Soporte and Recargas. It supports mouse hover, click, keyboard and touch. Support and recharge links open WhatsApp with a prepared message to +57 3223037790. The user chooses whether to send the message.

Client visibility settings also apply to the profile/orders header and empty-order shopping shortcut. Historic order filters may still show previously purchased departments: disabling a sales section does not erase purchase history.

## 05. Registration, login and password recovery
To register, open Registrarse, enter a name, email, password and account type, then select Crear cuenta. A successful response creates the User immediately and returns the form to login with a success message. The password field is cleared. The user then selects Entrar a Goat with the new credentials; the welcome animation appears only after successful login.

Email addresses are trimmed and lowercased for signup and login. A database unique constraint prevents duplicate accounts, including simultaneous signup attempts. Registration passwords require 10 to 128 characters and a maximum of 72 UTF-8 bytes, avoiding bcrypt truncation. Passwords are stored as bcrypt hashes, not readable text. A visibility control lets users show or hide entered passwords.

Old waiting-screen tickets are removed from browser session storage. Verification, resend and registration-status endpoints are retired with HTTP 410. Old pending registrations do not automatically become accounts; those users must register again. PendingRegistration remains in the schema for historical data and migration compatibility.

Password recovery uses ¿Olvidaste tu contraseña? and requires a configured Resend API key and authorized EMAIL_FROM. Reset tokens expire after 30 minutes, are single-use and are stored as SHA-256 hashes. Successful reset increments sessionVersion to invalidate previous sessions. The request message does not confirm whether an email is registered; check provider logs when delivery fails.

A verified sending domain is required for customer email delivery in production. The Resend test sender is limited to the account owner's recipient address. Removing signup confirmation does not remove the mail requirement for password recovery.

## 06. Catalog, search and editorial content
Inicio starts with Streaming selected. Digital filters include Todos, Streaming, Música, Productividad and Combos. Todos means the digital catalog, not all physical departments. Search matches product names. Platform links from the editorial shelf can open Streaming filtered by that platform.

Tienda groups technology into Computadores, Periféricos, Audio, Accesorios and Redes. Segunda contains Tecnología usada, Ropa usada and Calzado usado. The seed utilities provide 50 example technology products and 50 example used products. These are sample records, not proof of real stock, condition, licensing or availability. Replace their commercial details before offering them for sale.

Historias que enganchan is an editorial discovery component on home/streaming views, before the plan cards. It offers horizontal scrolling, arrows and platform selection for Netflix, Prime Video, Disney+, HBO Max, Apple TV+, Paramount+, Crunchyroll, ViX and YouTube. Titles and genres are curated in lib/streaming-highlights.ts; the component is not connected to a live popularity or availability feed.

Each product card has a representative image and stock indicator. Products remain visible at zero stock with Agotado and cannot be added to the cart. Positive stock is shown in green. Catalog updates are polled approximately every 15 seconds while the tab is visible; checkout always validates the current server state.

The home hero uses six rotating background images at seven-second intervals while text and actions remain fixed. Pause and reduced-motion handling are available. Login includes a local animated background and a goat mascot; the welcome animation respects reduced-motion settings.

## 07. Cart, checkout and financial integrity
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
For a Streaming product, stock equals the number of available individual StreamingAccess rows. Manual product stock is not a substitute for real streaming inventory. A legacy shared Product.deliveryCipher is no longer delivered for Streaming. Existing products can therefore show Agotado until unsold access entries are added.

Administrator procedure:
1. Open Perfil, then Administrar productos, stock e imágenes.
2. Create or find the streaming product and select Editar.
3. Open Inventario privado de streaming.
4. Add one entry per unsold profile: platform, receipt heading, email, password, profile and optional PIN.
5. Use a consistent platform identity across plans; Netflix x28 and x33, for example, belong to netflix.
6. Confirm the available count updates. A new product must be saved before inventory can be attached.

Identity is based on normalized platform, email and profile, protected with HMAC and a unique database constraint. Changing a password or PIN cannot turn an already registered profile into a new saleable identity. Duplicate identities are blocked across products, sold entries and retired entries. Historical streaming receipts are also checked when new inventory is added.

Available entries can have their password, PIN or receipt heading corrected. Their platform/email/profile identity is immutable in the editor. Retiring an entry is permanent in the current workflow and removes it from available stock. Sold entries are linked to their order line and cannot be edited, retired or resold. There is no automatic renewal, expiry-based restocking or reassignment process.

For multiple units, checkout creates a separate access section for each unit in the saved receipt. Entries are claimed atomically with the order and debit. Administrators can see available/sold counts and the first 100 available entries returned by the inventory API. Other digital categories retain their legacy/manual delivery workflow; the individual-inventory guarantee described here applies to category Streaming.

## 09. Orders, receipts and profile dashboard
After checkout, the customer is taken to Pedidos and a centered receipt dialog opens for the completed order. Closing it does not delete the order or receipt. Receipts remain available only within the owning buyer's order history. A customer's guessed order ID does not grant access to another account's receipt.

| Receipt content | Meaning |
|---|---|
| Heading and platform | Administrator-configured heading and purchased product name |
| Email, password, profile, PIN | Assigned platform access at purchase time |
| Reference and date | Saved order reference and purchase time |
| Quantity and amount | Unit or line information according to delivery type |
| Usage notice | Instruction not to change platform account/profile data |

Receipt text is encrypted as an immutable purchase snapshot. Later price or credential changes do not rewrite previous receipts. Asterisks used for emphasis render as bold text; the viewer does not interpret arbitrary HTML. A receipt is an access-delivery record, not an integrated electronic tax invoice.

Orders with configured delivery for every line receive ENTREGADO. Physical/manual or mixed orders can remain PENDIENTE_ENTREGA. The application does not currently implement a complete administrator fulfillment, cancellation or refund workflow.

History supports 20 orders per page, department filters and grouped line subtotals for mixed orders. The summary API returns a bounded recent list; the private history page supplies the full paginated view. Dates in account/receipt presentation use America/Bogota. Monetary amounts are integer COP values.

Perfil shows name, email, role, balance, total recorded spending, registration date, order count and up to ten recent purchased products. Seller/admin profiles can also show recent sales according to ownership rules. Spending is the sum of recorded purchases and is not adjusted by a refund subsystem because that subsystem does not exist.

## 10. Administrator operating procedures
The administrator dashboard is reached through Perfil → Administrar productos, stock e imágenes, or /administracion. A non-admin account is redirected. Product creation/editing is validated on the server; seller API permissions are restricted to owned products.

| Task | Procedure and result |
|---|---|
| Duplicate product | Select Duplicar; copy is created immediately and opens in the editor |
| Change price | Edit product → Precio (COP) → Guardar producto; future orders use the new price |
| Edit description/name | Edit product details and save; historic line snapshots keep their recorded content |
| Replenish Streaming | Add unsold individual accesses; availability is derived automatically |
| Update other stock | Enter real quantity; concurrent stock changes can require reopening the editor |
| Mark sold out | Agotar sets manual stock to zero; available streaming entries are retired |
| Recharge balance | Select user and amount; confirm the real-world payment independently, then record recharge |
| Change section access | Secciones disponibles para clientes → toggle Tienda or Segunda independently |
| Reorder cards | Enable admin ordering, drag or use arrow controls; saved order applies globally |

Duplicar copies the catalog name (with a copia suffix), category, price, description, mark, background and custom product image. The new record belongs to the account creating it and has an independent image. ADMIN may duplicate any product; VENDEDOR may duplicate owned products only. Every copy starts with zero stock and no shared credentials, individual accesses, order associations or wallet events. Add real inventory before selling it. Closing the editor does not delete the already-created copy. The source remains unchanged; a failure to copy the image rolls back creation.

A recharge is an administrative credit, not a bank transaction or payment gateway confirmation. The API permits a positive integer amount up to COP 10,000,000 per request and records a RECARGA WalletEvent including the administrator reference in the note. Purchases record COMPRA events. There is no automatic payment reconciliation or seller settlement.

Section switches default to enabled when no settings row exists. For CLIENTE they hide storefront/account-header links, redirect disabled pages, exclude affected catalog products and block new purchases, including stale carts. ADMIN and VENDEDOR keep access. Old purchases remain visible.

Card-order changes carry a version number to detect concurrent edits. On a conflict, reload before trying again. Product edits also check the expected current stock. Do not bypass these safeguards by restoring old quantities manually in the database.

## 11. Images, branding and interface maintenance
Administrators can replace hero backgrounds, product/category images and editorial series/platform images. Uploaded JPEG, PNG and WebP files are restricted to 2 MB each and checked by actual stream size and file signature. Uploaded SVG is not accepted. The built-in illustrations and platform placeholders are local assets.

| Asset | Stored location | Editing method |
|---|---|---|
| Six home backgrounds | BannerImage in PostgreSQL | Banner image controls; restore removes override |
| Product/category images | CatalogImageAsset | Administrator image upload controls |
| Series/platform images | CatalogImageAsset with logical keys | Editar imágenes de series on the editorial shelf |
| Default assets | public/images and selection helpers | Repository change followed by deployment |

Database uploads remain available across deployments when the same database and records are preserved. A local file on an administrator's computer is not hosted merely because its local path was entered; use the upload control. Files committed under public are deployed with the application.

Some new uploads are resized and converted to WebP in the browser when beneficial; server validation still applies. Authenticated image endpoints use private revalidation and ETags. Image metadata has a short client refresh interval, and static fallbacks are used if no override exists.

Use representative, legally usable assets, meaningful product descriptions and real condition photographs for used goods. Recommended home-banner dimensions are approximately 1600 × 700 pixels. Actual appearance should be checked on both a narrow mobile screen and desktop. The source controls shelf/card dimensions; there is no general administrator size editor.

## 12. Architecture and repository organization
Goat Store is a Next.js App Router application using React and TypeScript. Server route handlers enforce identity, permissions, validation and financial operations. Prisma accesses PostgreSQL. Customer state in the browser improves the interface but is never the authority for balance, price or access assignment.

| Layer | Responsibilities and implementation |
|---|---|
| Browser | React screens, cart storage, filters, animations and administrator interactions |
| Next.js server | Pages, route handlers, sessions, authorization and input validation |
| Business services | Inventory allocation, receipts, account history, catalog ordering and migration |
| PostgreSQL | Users, products, stock, orders, wallet events, private inventory and uploaded images |
| Optional email | Resend for password reset, not signup |
| External contact | WhatsApp deep links; no automatic outbound support messages |

The principal dependencies are Next.js 15, React 19, Prisma 6, Zod 4, bcryptjs, jose and lucide-react; exact installed versions are pinned by package-lock.json. package.json specifies compatible version ranges. Use a supported Node.js release compatible with the dependencies; environment-file scripts require Node.js 20.6 or newer.

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
| Product → StreamingAccess | Individually available, sold or retired access entries |
| OrderItem → StreamingAccess | Which sold accesses fulfilled the purchase line |
| Order → CheckoutAttempt | Recovery of an idempotent checkout request |
| User → WalletEvent | Recorded recharges and purchase debits |
| User → PasswordReset | Temporary one-use reset authorizations |

Product.description, price and credential configuration can change; OrderItem stores the name, unit price, quantity, category and seller reference recorded at purchase. Receipt ciphertext preserves delivered content separately. This distinction is essential when troubleshooting a customer's past purchase.

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

The configured provider, active production branch and secret values have not been independently inspected for this manual. The public address used during setup was https://goat-goat-8011.vercel.app; verify the active domain in Vercel before changing APP_URL.

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

Optional sample catalogs are loaded with npm run db:seed:technology and npm run db:seed:secondhand. Do not treat example product quantities or descriptions as verified commercial inventory.

For a local production-style run, execute npm run build followed by npm run start. Development mode compiles pages on demand and is not a representative production performance measurement. Never commit .env, its connection strings or administrator credentials.

## 17. Vercel deployment and domain operation
The source baseline is on password-reset. Deploying an older main commit may fail to detect Next.js or omit recent features. Confirm the actual branch and commit in each deployment; redeploying an old failed deployment reuses its old source.

1. Import cabr444/Goat_Store into Vercel.
2. Set the production branch to the intended maintained branch, currently password-reset.
3. Select Next.js, root directory ./ and build command npm run build.
4. Configure runtime variables for the appropriate Production/Preview environment.
5. Apply the Prisma schema to the chosen PostgreSQL database and initialize or migrate data deliberately.
6. Create a deployment from the correct Git reference and wait for Ready.
7. Set APP_URL to the canonical public HTTPS address and redeploy after environment changes.
8. Test signup, login, section visibility, balance, streaming stock, purchase and private receipts.

Vercel hosts the application and the database provider hosts PostgreSQL; a deployed site does not depend on the owner's PC remaining on. localhost:3000 is only a local address. For public customers, verify that deployment protection does not require a Vercel account. Use the public application address rather than a dashboard link.

A custom domain is optional. Configure it in Vercel and its DNS provider, then update the canonical APP_URL. Owning a vercel.app site does not let the merchant verify vercel.app as a Resend sending domain. Email sending and website hosting are separate configurations.

Search visibility is not automatic. The current login-gated catalog limits public indexing. Public catalog pages, sitemap/robots work and search-console onboarding are possible future improvements; no Google ranking or indexing outcome is guaranteed by deployment.

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
Unit checks use npm test; type checking uses npx tsc --noEmit; production compilation uses npm run build. npm audit --omit=dev reports known advisories at execution time, not a permanent security guarantee. Tests were not re-executed solely to create this document; use the commands against the intended release.

PostgreSQL integration suites cover inventory, unique streaming allocation, multi-product checkout/retries, direct signup/login, section controls, card order and migration. Inventory-oriented suites require a disposable local goat_inventory_test database and a matching local server. Migration tests require disposable local source/target test databases. Never run integration fixtures against customer databases.

| Symptom | Investigation or action |
|---|---|
| NEXT_NO_VERSION | Verify branch/commit, root ./ and package.json containing Next.js |
| Solicitud no autorizada | Check deployment revision, request origin, APP_URL and Vercel aliases; deploy the origin fix |
| No fue posible procesar la solicitud | Inspect redacted server logs; verify database connectivity and tables such as RateLimit |
| Correo o contraseña incorrectos | Confirm the account exists in the exact active database; use reset rather than editing passwordHash |
| Missing users after database change | A URL change does not transfer records; migrate or intentionally register in the new database |
| Sender not authorized | Relevant to password reset: verify EMAIL_FROM domain and Resend settings; signup no longer sends mail |
| Streaming shows Agotado | Add available individual profiles; old shared credentials/manual stock do not replenish Streaming |
| Stock/order conflict | Reload current stock/order version; do not overwrite recent sales with stale values |
| New code not visible | Confirm the expected commit is Ready, use the correct public domain and refresh the page |
| Tienda/Segunda visible to a client | Verify saved switches and latest account-header fix 42fd1ce or later |

Known limits include open seller signup, no application MFA, no automated payment gateway or refund engine, no complete fulfillment panel, no automatic seller payouts, no profile renewal/recycling and no anonymous public catalog. Editorial series content is curated, not a live ranking. Technology and used catalogs require manual operational management. Future work should prioritize the business's actual sales, support and compliance requirements.

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
| StreamingAccess | id, productId, fingerprint (unique), platform, cipher, createdAt, version, soldAt?, retiredAt?, orderItemId? | Individual one-time streaming inventory |

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
| GET /api/storefront | Authenticated | User, permitted products, recent own orders, settings and card order; user list for admin only |
| GET /api/products | Authenticated | Permitted public product fields and settings |
| POST /api/products | ADMIN / VENDEDOR | Create validated product with current user ownership |
| PATCH /api/products/[id] | ADMIN / owning VENDEDOR | Product values and expectedStock; guarded update |
| POST /api/products/[id]/duplicate | ADMIN / owning VENDEDOR | Create independent catalog/image copy with zero stock and no private delivery data |
| DELETE /api/products/[id] | ADMIN / owning VENDEDOR | Mark sold out; retire available streaming entries |
| GET /api/orders | Authenticated | Latest 50 own orders with safe line information |
| POST /api/orders | Authenticated | items[{id,qty}], optional checkoutKey; transactional purchase/recovery |
| GET /api/admin/users | ADMIN | User identity, role and balance list |
| POST /api/admin/recharge | ADMIN | userId, amount, note; recorded administrative credit |
| GET, PUT /api/admin/store-options | ADMIN | Read settings; update department and enabled |
| PUT /api/admin/card-order | ADMIN | kind, id, target, position, version |
| GET, PUT /api/admin/products/[id]/delivery | ADMIN | Legacy digital delivery fields; PUT rejected for Streaming |
| GET /api/admin/products/[id]/inventory | ADMIN | Available entries, counts, platform and legacy indicator |
| POST, PATCH, DELETE /api/admin/products/[id]/inventory | ADMIN | Add, edit or retire individual streaming entries; version checks on changes |
| GET /api/banners | Authenticated | Banner override metadata |
| GET /api/banners/[slot] | Authenticated | Image bytes; private ETag revalidation |
| POST, DELETE /api/banners/[slot] | ADMIN | Upload or remove one hero override |
| GET /api/catalog-images | Authenticated | Catalog image metadata |
| GET /api/catalog-images/file | Authenticated | Image bytes for logical key |
| POST, DELETE /api/admin/images | ADMIN | Upload/remove category, product, series or platform image |

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

Release checklist: confirm branch/commit; protect database/secrets; apply only reviewed schema changes; configure environment and mail where needed; run relevant checks; wait for Ready; verify correct public domain; test a customer journey; confirm hidden sections; inspect private receipt access and monitor redacted logs.

Glossary: COP is Colombian peso; saldo is the internal prepaid balance; pedido is an order; perfil is the account dashboard or platform profile depending on context; agotado means sold out; checkout key identifies one retryable purchase intent; ciphertext is encrypted content; a provider connection string selects a database, while an API key authorizes a service.

Revision record: 1.0 — 17 October 2026 — Initial English edition based on source 42fd1ce; includes direct signup, individual streaming inventory, migration tooling and account-navigation visibility fixes. Update this entry and the Spanish edition when behavior changes.


1.1 — 18 October 2026 — Updated to source 56f7f83: product duplication, independent image copying, zero-stock/private-data safeguards, ownership permissions and mobile editor guidance.
