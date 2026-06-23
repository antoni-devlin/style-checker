// Style rule definitions are kept in a separate content script for easier maintenance and version control.
// Style rule definitions are kept in a separate content script for easier maintenance and version control.
const styleRules = [
  { name: "Link text is only one word", regex: /\[([^\s\]]+)\]\(([^)]+)\)/ },
  { name: "H1s in body content", regex: /^#(?!#)\s*(.+)$/ },
  { name: "Bold in content", regex: /(\*\*|__)(.*?)\1/ },
  {
    name: "Consecutive headers of the same level",
    regex: /^(#{1,6})(.*)$\s+^\1(.*)$/,
  },
  {
    name: "No long tables",
    regex:
      /(?:^(?:\|[^|\r\n]*){6,}\|[\r\n]+^\|[\s|:-]+\|[\r\n]+(?:^\|[^\r\n]+\|(?:[\r\n]+|$))+)|(?:^\|[^\r\n]+\|[\r\n]+^\|[\s|:-]+\|[\r\n]+(?:^\|[^\r\n]+\|[\r\n]+){11,}(?:^\|[^\r\n]+\|(?:[\r\n]+|$))*)/,
  },
  {
    name: "Tables without row or column headers",
    regex: /^(?:\|[^\r\n]+\|[\r\n]*){2,}/,
  },
  {
    name: "No FAQs",
    regex: /\b(FAQ|Frequently Asked Question)s?\b/i,
  },
  {
    name: "Write in plain and simple English",
    regex:
      /\b(a total of|absolutely|abundantly|accede to|accelerate|accentuate|accommodation|accompanying|accomplish|accordingly|acknowledge|acquiesce|acquire|actually|adjacent|adjustment|admissible|advantageous|advise|affixafforded|aforesaid|aggregate|aligned|all things being equal|alleviate|allocate|alternative|alternatively|ameliorate|amendment|anticipate|apparent|appreciable|apprise|appropriate|approximately|as a consequence of|as of the date|as regards|ascertain|assistance|attempt|attend|authorise|basically|being the case|belated|beneficial|bestow|breach|by means of|cease|circumvent|clarification|combine|combined|commence|commenced|communicate|communicated|competent|compile|comply|component|comprise|compulsory|conceal|concerning|conclusion|concur|condition|consequently|considerable|constitute|construe|consult|consumption|contemplate|contrary|correspond|correspondance|courteous|cumulative|currently|customary|deduct|deficiency|demonstrate|denote|depict|designate|desire|despatch|determine|detrimental|difficulties|diminish|disburse|discharge|disclose|disconnect|discontinue|discrete|dispatch|disseminate|documentation|domiciled|dominant|due to the fact|duration|during the period from|during which time|dwelling|economical|elucidate|emphasise|empower|enable|enclosed|encounter|endeavour|enquire|enquiry|ensure|envisage|equivalent|erroneous|establish|evaluate|evince|exceptionally|excessive|exclude|excluding|exclusively|exempt from|expedite|expeditiously|expenditure|expire|extant|extremely|extremity|fabricate|facilitate|factor|failure to|finalise|following|for the duration of|for the purpose of|for the reason that|formulate|forthwith|frequently|furnish|further to|furthermore|generate|give consideration to|henceforth|hereby|herein|hereinafter|hereof|hereto|heretofore|hereunder|herewith|hitherto|hold in abeyance|if and when|illustrate|immediately|implement|imply|in a number of cases|in accordance with|in addition|in advance|in case of|in conjunction with|in connection with|in consequence|in due course|in excess of|in lieu of|in order that|in receipt of|in relation to|in respect of|in the absence of|in the course of|in the event|in the majority of instances|in the near future|in view of the fact that|inappropriate|inception|incorporating|incurred|indicate|inform|initially|initiate|insert|instances|intend to|irrespective|jeopardise|large number of|liaise|locate|locality|magnitude|mandatory|manner|manufacture|marginal|material|materialise|matter of fact|may in the future|merchandise|mislay|modification|moreover|negligible|nevertheless|notwithstanding|numerous|objective|obligatory|obtain|obviously|occasioned by|of course|of the opinion|on behalf of|on numerous occasions|on receipt of|on request|on the grounds that|on the occasion that|on the subject of|operate|optimum|option|ordinarily|outstanding|owing to|partially|participate|particulars|per annum|perform|permissible|percentage of|personnel|persons|peruse|possess\b|practically|preserve|principal|prior to|proceed|procure|profusion of|projected|prolonged|promptly|promulgate|proportion|provide|provided that|provisions|proximity|purchase|pursuant to|qualify for|question as to whether|quite|really|reconsider|reduce|reduction|refer to|referred to as|regard to|regarding|reimburse|reiterate|relating to|remainder|remittance|remuneration|render|require|requirements|reside|retain|revised|scrutinise|select|similarly|solely|subject to|submit|subsequent|subsequently|substantial|substantially|sufficient|supplementary|terminate|the fact of the matter is|thereafter|thereby|therein|thereof|thereto|thus|to date|to the extent that|transmit|ultimately|unavailability|undernoted|undersigned|undertake|unoccupied|until such time|utilisation|utilise|variation|virtually|visualise|ways and means|whatsoever|whensoever|whereas|whether or not|with a view to|with reference to|with regard to|with respect to|you are requested|your attention is drawn)\b|(?<![\.\?!]\s)subject access\b(?!\srequest\b)/i, // Fixed inline flag
  },
  {
    name: "Anchor links",
    regex: /\[([^\]]+)\]\((?:https?:\/\/[^\s)]+)?#[^)]+\)/,
  },
  {
    name: "Table too short, too few rows and columns",
    regex:
      /^(?:\|[^|\r\n]+\|[\r\n]+)(?:\|[\s:-]+\|[\r\n]+)(?:\|[^|\r\n]+\|(?:[\r\n]+|$)){1,2}/,
  },
  {
    name: "Acronyms defined on first use, and abbreviations without periods",
    regex:
      /\b(?!(?:UK|DVLA|USA|EU|VAT|MP)\b)(?:[A-Z]{2,6}|[A-Z](?:\.[A-Z])+\.?)\b/,
  },
  {
    name: "Only use the active voice",
    regex:
      /\b(am|is|are|was|were|be|been|being)\b(?:\s+\w+){0,3}\s+(\w+ed|written|done|seen|taken|built|sent|chosen|given|made|kept|run|set|told|shown|held)\b/,
  },
  {
    name: "Bullet lists have a lead-in line",
    regex: /(^\s*$[\r\n]+)^\s*[*+-]\s+.+$/,
  },
  {
    name: "Negative contractions",
    regex: /\b\w+n't\b/,
  },
  {
    name: "eg, etc, ie",
    regex: /\b(?:e\.?g\.?|i\.?e\.?|etc\.?)\b/,
  },
  {
    name: "Dates",
    regex:
      /\b(?:\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|tax\s+year\s+\d{4}\s+to\s+\d{4}|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+to\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\d{1,2}(?:am|pm)\s+to\s+\d{1,2}(?:am|pm)|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+to\s+\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+to\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\(14\s+June\s+2012\))\b/,
  },
];
