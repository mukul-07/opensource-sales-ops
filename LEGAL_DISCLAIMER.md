# Legal Disclaimer & Acceptable Use

## 1. Nature of the Project

`opensource-sales-ops` is a collection of Markdown prompts, Node.js scripts, and configuration templates. It is strictly a local execution tool. The maintainers do not host, deploy, or operate an AI system, nor do we provide API access to Large Language Models (LLMs).

Users download the code, run it on their own machines, and connect it to their own AI provider (Anthropic, OpenAI, or any other). The maintainers have no visibility into, control over, or responsibility for how the tool is used after download.

## 2. Data Privacy (GDPR)

The maintainers do not act as a Data Controller or Data Processor under GDPR or any other data protection regulation.

- All Personal Identifiable Information (PII) you input — prospect names, contact details, company data, case studies — is processed locally on your machine.
- When you use an AI CLI tool (Claude Code, Codex, OpenCode), your data is sent directly to the AI provider you chose. Review their privacy policies.
- If you use optional third-party lead-enrichment APIs (Apollo, Hunter, Clay, etc.), data is also sent to those providers under their respective terms. You are responsible for ensuring lawful basis under GDPR / CAN-SPAM / CASL / equivalent laws in the jurisdictions you target.
- We do not collect analytics, telemetry, or usage data of any kind.
- API keys, credentials, and personal files are gitignored by default. Never commit them to a public fork.

## 3. AI Model Behavior

This tool interfaces with AI models via third-party CLI tools. The maintainers do not control these models and cannot guarantee their behavior.

- **Hallucinations:** AI models may fabricate company details, contact names, case studies, metrics, or quotes. You must manually verify all generated outreach before sending.
- **Safety guardrails:** The default prompts instruct the AI never to auto-send outreach and to stop before the final send action. However, AI compliance is not guaranteed. If you use different models, modify the system prompts, or override the safety instructions, you accept full responsibility for the AI's actions.
- **Qualification accuracy:** Prospect scores and recommendations are AI-generated opinions based on pattern matching, not professional sales advice. They should inform your judgment, not replace it.

## 4. Third-Party Platforms & Anti-Spam Compliance

opensource-sales-ops interacts with third-party sources (applicant tracking systems, search engines, lead databases).

- Users must comply with the Terms of Service of every platform they interact with.
- Users must comply with applicable anti-spam and privacy laws: **CAN-SPAM (US), GDPR (EU), CASL (Canada), PECR (UK)** and any other jurisdiction they target. This includes having a lawful basis to contact prospects, honoring opt-outs, providing accurate sender identification, and not using misleading subject lines.
- Do not use this tool to scrape platforms that prohibit automated access.
- Do not use this tool to spam prospects, overwhelm inboxes, or send mass outreach without personalization and lawful basis.
- Any consequences from ToS or legal violations — including blocklisting, domain reputation damage, platform bans, or legal action — are solely the responsibility of the user.
- The maintainers actively reject contributions that facilitate ToS or anti-spam violations (see CONTRIBUTING.md).

## 5. Acceptable Use

opensource-sales-ops is designed to help sellers make better targeting and outreach decisions, not to automate away human judgment or send spam. Acceptable use includes:

- Qualifying prospects to prioritize your time
- Generating tailored outreach drafts that you review and edit before sending
- Scanning public sources for buying-intent signals
- Tracking your pipeline and cadence

Unacceptable use includes:

- Auto-sending outreach without human review (violates HITL design)
- Scraping platforms that prohibit automated access
- Sending AI-generated outreach without verifying its accuracy and appropriateness
- Using the tool to deceive, impersonate, manufacture false urgency, or namedrop contacts you don't know
- Contacting prospects in violation of CAN-SPAM, GDPR, CASL, PECR, or equivalent laws

## 6. EU AI Act

Because this tool runs locally, is free, and is open-source, the maintainers are not placing an AI system on the market or putting one into service under the EU AI Act. Users who deploy the tool in a commercial or organizational context should assess their own obligations under the AI Act.

## 7. Indemnification

By using opensource-sales-ops, you agree to indemnify, defend, and hold harmless the authors, contributors, and any affiliated parties from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of this software, your violation of these terms, or your violation of any third-party terms of service or applicable law.

## 8. Cost Responsibility

If you use paid AI providers (Anthropic API, OpenAI API, etc.) or paid lead-enrichment providers (Apollo, Hunter, Clay, etc.), you are solely responsible for monitoring and managing your own usage and associated costs. The maintainers are not responsible for unexpected charges.

## 9. MIT License

As stated in the [LICENSE](LICENSE) file:

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 10. Changes

This disclaimer may be updated as the project evolves. Users are encouraged to review it periodically.
