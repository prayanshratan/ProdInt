import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isTemporaryEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false

  // Comprehensive list of temporary email domains - Updated with all major providers
  const tempDomains = [
    // ===== TEMP-MAIL.ORG & ROTATING DOMAINS =====
    'temp-mail.org', 'temp-mail.com', 'temp-mail.io', 'tempmail.com', 'tempmail.net', 'tempmail.us',
    'tempmail.plus', 'tempmail.dev', 'tempmailaddress.com', 'tempemail.com', 'tempemail.net',
    'rteet.com', 'enaux.com', 'meantinc.com', 'iffymedia.com', 'jollyfree.com',
    'lyricspad.net', 'ippandapro.com', 'utooemail.com', 'civx.org', 'dicxcr.com',
    'emlhub.com', 'emltmp.com', 'tmail.ws', 'tmails.net', 'e4ward.com',
    'tmpmail.net', 'tmpmail.org', 'tmpnator.live', 'tmpbox.net', 'tmpeml.info',
    'wxnw.net', 'jzora.com', 'edxplus.com', 'pooae.com', 'wqsua.com',
    'dmainz.net', 'xojxe.com', 'dnses.ro', 'bareed.ws', 'tfwno.gf', 'rppkn.com',
    'aheadwe.com', 'bestoption25.club', 'smartnator.com', 'tempsky.com', 'tempm.com',
    'temp-link.net', 'tempemail.net', 'tempinbox.com', 'tempail.com',
    
    // ===== GUERRILLA MAIL & ALL DOMAINS =====
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
    'guerrillamail.de', 'guerrillamail.info', 'guerrillamailblock.com',
    'sharklasers.com', 'grr.la', 'pokemail.net', 'spam4.me', 'guerrillamail.co.uk',
    
    // ===== MAILINATOR & ALL PUBLIC DOMAINS =====
    'mailinator.com', 'mailinator.net', 'mailinator2.com', 'mailinater.com',
    'notmailinator.com', 'reconmail.com', 'thisisnotmyrealemail.com',
    'vomoto.com', 'chammy.info', 'tittbit.in', 'letthemeatspam.com',
    'sogetthis.com', 'suremail.info', 'reallymymail.com', 'binkmail.com',
    'safetymail.info', 'tradermail.info', 'mailinater.com', 'mailinator.co.uk',
    'mailinator.org', 'mailinater.net',
    
    // ===== 10 MINUTE MAIL & VARIANTS =====
    '10minutemail.com', '10minutemail.net', '10minemail.com', '10minutemail.co.za',
    '10minutemail.de', '10minutemail.pl', '10minutemail.org', '10minutemail.us',
    '20minutemail.com', '20minutemail.it', '30minutemail.com', '60minutemail.com',
    '10mail.org', '10mail.com',
    
    // ===== YOPMAIL & ALL DOMAINS =====
    'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
    'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
    'yomail.info', 'yep.it', 'yodx.ro',
    
    // ===== MAILDROP & VARIANTS =====
    'maildrop.cc', 'maildrop.com', 'maildrop.gq', 'mailforspam.com',
    'mailnull.com', 'mailcatch.com', 'mailtome.de', 'maildx.com', 'maildax.com',
    
    // ===== GETNADA & SIMILAR =====
    'getnada.com', 'getnada.cc', 'getnowtoday.cf', 'getmule.com',
    'getairmail.com', 'getonemail.com', 'getonemail.net',
    
    // ===== MOHMAL & VARIANTS =====
    'mohmal.com', 'moakt.com', 'meltmail.com',
    
    // ===== THROWAWAY/TRASH MAIL =====
    'throwaway.email', 'throwemail.com', 'throwawaymail.com',
    'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
    'trashemail.de', 'trash-mail.com', 'trashymail.com', 'trashcanmail.com',
    'trash-mail.at', 'trash-mail.cf', 'trash-mail.de', 'trash-mail.ga',
    'trash-mail.gq', 'trash-mail.ml', 'trash-mail.tk',
    
    // ===== FAKE MAIL SERVICES =====
    'fakeinbox.com', 'fakemail.com', 'fakemailgenerator.com', 'fake-mail.cf',
    'fake-mail.ga', 'fake-mail.ml', 'fake-mail.tk', 'fakemailz.com',
    'fakemail.net', 'fakemail.fr', 'fakeinbox.net', 'fakeinbox.info',
    'emailfake.com', 'emailfake.ml', 'email-fake.com',
    
    // ===== DISCARD/DISPOSABLE MAIL =====
    'discard.email', 'discardmail.com', 'discardmail.de', 'dispostable.com',
    'disposable.com', 'disposable-email.ml', 'disposablemail.com',
    'disposable.email', 'disposemail.com', 'disposableinbox.com',
    'disposeamail.com', 'disposableaddress.com',
    
    // ===== SPAM RELATED =====
    'spamgourmet.com', 'spambox.us', 'spaml.com', 'spaml.de',
    'spamfree24.com', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info',
    'spamfree24.net', 'spamfree24.org', 'spamoff.de', 'spam.la',
    'spamex.com', 'spamcorptastic.com', 'spambog.com', 'spambog.ru',
    'spambog.de', 'spamavert.com', 'spamspot.com', 'spamthis.co.uk',
    'spamstack.net', 'spamday.com', 'spamcon.org', 'spamcannon.com',
    'spamcannon.net', 'spameater.com', 'spameater.org',
    
    // ===== INBOXES.COM & VARIANTS =====
    'blondmail.com', 'chapsmail.com', 'clowmail.com', 'fivermail.com',
    'gimpmail.com', 'guysmail.com', 'replyloop.com', 'spicysoda.com',
    'temptami.com', 'tupmail.com',
    
    // ===== EMAIL ON DECK =====
    'emailondeck.com', 'emailtemporanea.com', 'emailtemporario.com.br',
    'emailto.de', 'emailxfer.com', 'emeil.in', 'emeil.ir', 'emailias.com',
    
    // ===== MINT/TEMP EMAIL =====
    'mintemail.com', 'mytemp.email', 'mytrashmail.com', 'mytrashemail.com',
    'mufmail.com', 'muell.icu',
    
    // ===== BURNER MAIL =====
    'burnermail.io', 'burner.email', 'burner.kokusu.org',
    
    // ===== JETABLE & VARIANTS =====
    'jetable.org', 'jetable.com', 'jetable.net', 'jetable.fr.nf',
    
    // ===== ANONBOX & ANONYMBOX =====
    'anonbox.net', 'anonymbox.com', 'anonmails.de', 'anonymized.org',
    
    // ===== INBOX SERVICES =====
    'inboxkitten.com', 'inboxbear.com', 'inboxstore.me', 'inbox.si',
    'tempinbox.co.uk',
    
    // ===== GERMAN TEMP MAIL SERVICES =====
    'wegwerfmail.de', 'wegwerfemail.de', 'wegwerfadresse.de', 'wegwerf-emails.de',
    'weg-werf-email.de', 'wegwerfemail.com', 'wegwerfmail.net', 'wegwerfmail.org',
    'zehnminutenmail.de', 'hulapla.de', 'hidemail.de',
    
    // ===== FRENCH TEMP MAIL =====
    'mail-temporaire.fr', 'yopmail.gq', 'jetable.pp.ua',
    
    // ===== MAIL.TM & VARIANTS =====
    'mail.tm', 'mail.td', 'mail.com', 'mailexpire.com',
    
    // ===== VARIOUS TEMP PROVIDERS =====
    'tempmail.de', 'tempmail.it', 'mowgli.jungleheart.com', 'mox.pp.ua',
    'rootfest.net', 'rhyta.com', 'teleworm.us', 'jourrapide.com',
    'einrot.com', 'dayrep.com', 'cuvox.de', 'fleckens.hu',
    'superrito.com', 'armyspy.com', 'gustr.com', 'teleworm.com',
    'devnullmail.com', 'gishpuppy.com', 'airmail.cc', 'air2token.com',
    'proxymail.eu', 'punkass.com', 'putthisinyourspamdatabase.com',
    'sneakemail.com', 'slopsbox.com', 'wetrainbayarea.com',
    'harakirimail.com', 'hellodream.mobi', 'haltospam.com', 'hatespam.org',
    'incognitomail.org', 'incognitomail.com', 'incognitomail.net',
    'mailimate.com', 'mailinblack.com', 'mailmoat.com', 'mailsac.com',
    'mailnesia.com', 'mailtothis.com', 'mailcatch.com', 'crazymailing.com',
    'generator.email', 'easytrashmail.com', 'emailsensei.com',
    'deadaddress.com', 'deadfake.cf', 'damnthespam.com',
    'chacuo.net', 'clipmail.eu', 'clrmail.com', 'bumpymail.com',
    'bugmenot.com', 'brefmail.com', 'beefmilk.com',
    'buyusedlibrarybooks.org', 'zemail.info', 'zippymail.info', 'zetmail.com',
    
    // ===== SHORT/NUMBERED DOMAINS =====
    '0-mail.com', '0815.ru', '0clickemail.com', '123-m.com',
    '1fsdfdsfsdf.tk', '1pad.de', '20email.eu', '2prong.com',
    '33mail.com', '3d-painting.com', '4warding.com', '4warding.net',
    '5gramos.com', '675hosting.com', '6url.com', '75hosting.com',
    '7tags.com', '9ox.net',
    
    // ===== ADDITIONAL DOMAINS =====
    'a-bc.net', 'agedmail.com', 'ama-trade.de', 'amilegit.com',
    'artman-conception.com', 'baxomale.ht.cx', 'bigstring.com',
    'bio-muesli.net', 'bobmail.info', 'bodhi.lawlita.com', 'bofthew.com',
    'bootybay.de', 'boun.cr', 'bouncr.com', 'breakthru.com',
    'bsnow.net', 'burstmail.info',
    
    // ===== ADDITIONAL TEMP SERVICES =====
    'upliftnow.com', 'uplipht.com', 'venompen.com', 'veryrealemail.com',
    'viditag.com', 'viewcastmedia.com', 'viewcastmedia.net', 'viewcastmedia.org',
    'vpn.st', 'vsimcard.com', 'vubby.com', 'wasteland.rfc822.org',
    'webemail.me', 'wh4f.org', 'whatiaas.com', 'whatpaas.com',
    'whiffles.org', 'whyspam.me', 'willhackforfood.biz', 'willselfdestruct.com',
    'winemaven.info', 'wronghead.com', 'wuzup.net', 'wuzupmail.net',
    'xagloo.com', 'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net',
    'yogamaven.com', 'yourdomain.com', 'yuurok.com',
    'z1p.biz', 'za.com', 'zipsendtest.com', 'zoaxe.com', 'zoemail.org', 'zomg.info',
    
    // ===== TEMPR.EMAIL & DOMAINS =====
    'tempr.email', 'tempmail.us', 'tempemail.co.za',
    
    // ===== ADDITIONAL VERIFIED DOMAINS FROM RESEARCH =====
    'appmailuk.com', 'momoi.uk', 'boxfi.uk', 'uma3.be', 'one-ml.com',
    'dea-21olympic.com', 'cazlv.com', '1xp.fr', 'cpc.cx', '0cd.cn',
    'prc.cx', 'b7s.ru', 'ab34.fr', 'e3b.org', 'new.ovh',
    'ves.ink', 'q0.us.to', 'zx81.ovh', 'wishy.fr', 'bmn.ch.ma',
    'iya.fr.nf', 'sdj.fr.nf', 'afw.fr.nf', 'mail34.fr', 'mynes.com',
    'dao.pp.ua', 'nori24.tv', 'lerch.ovh', 'breizh.im', 'six25.biz',
    'art.fr.cr', 'red.fr.cr', 'ywzmb.top', 'nyndt.top', 'isep.fr.nf',
    'noreply.fr', 'pliz.fr.nf', 'noyp.fr.nf', 'zouz.fr.nf', 'hunnur.com',
    'wxcv.fr.nf', 'zorg.fr.nf', 'imap.fr.nf', 'redi.fr.nf', 'dlvr.us.to',
    'y.iotf.net', 'zinc.fr.nf', 'ym.cypi.fr', 'yop.too.li', 'dmts.fr.nf',
    'binich.com', 'wzofit.com', 'jmail.fr.nf', 'zimel.fr.cr', 'yaloo.fr.nf',
    'jinva.fr.nf', 'ag.prout.be', 'ba.prout.be', 'es.prout.be', 'us.prout.be',
    'ealea.fr.nf', 'nomes.fr.nf', 'yop.kd2.org', 'my10minutemail.com',
    'trashmail.fr', 'trashmail.se', 'gomio.biz', 'svk.jp', 'f5.si',
    'macr2.com', 'ruru.be', 'neko2.net', 'fuwamofu.com', 'merry.pink',
    'cream.pink', 'choco.la', 'ichigo.me', 'via.tokyo.jp', 'eay.jp',
    'usako.net', 'mofu.be', 'prin.be', 'kkmail.be', 'niseko.be',
    'sendapp.uk', 'instmail.uk', 'nekosan.uk', 'meruado.uk', 'instaddr.win',
    'instaddr.uk', 'quicksend.ch', 'instaddr.ch', 'mbox.re', 'honeys.be',
    'heisei.be', 'moimoi.re', 'mirai.re', 'magim.be', 'fuwari.be',
    'nagi.be', 'kagi.be', 'tapi.re', 'simaenaga.com', 'sofia.re',
    'hotsoup.be', 'nekochan.fr', 'fanclub.pm', 'okinawa.li', 'stayhome.li',
    'owleyes.ch', 'nezumi.be', 'fukurou.ch', 'digdig.org', 'mama3.org',
    'hamham.uk', 'cocoro.uk', 'exdonuts.com', 'na-cat.com', 'xmailer.be',
    'ccmail.uk', 'nyasan.com', 'sendnow.win', 'eripo.net', 'goatmail.uk',
    'catgroup.uk', 'shchiba.uk', 'bangban.uk', 'onlyapp.net', 'haren.uk',
    'tatsu.uk', 'sute.jp', 'mxscout.com'
  ]
  
  // Check exact domain match
  if (tempDomains.includes(domain)) return true
  
  // Pattern-based detection for common temporary email patterns
  const tempPatterns = [
    /^temp.*mail/i,
    /^trash.*mail/i,
    /^spam/i,
    /^fake.*mail/i,
    /^disposable/i,
    /^throw.*away/i,
    /^guerrilla/i,
    /^mailinator/i,
    /^10min/i,
    /^yopmail/i,
    /^temp\d+/i,
    /^\d+min.*mail/i,
    /mail.*drop/i,
    /temp.*\./i,
    /.*tmp.*/i,
    /.*trash.*/i,
    /.*disposable.*/i,
    /.*burner.*/i
  ]
  
  // Check patterns
  if (tempPatterns.some(pattern => pattern.test(domain))) return true
  
  // Additional heuristics for suspicious domains
  // Very short domains (less than 5 chars) with common TLDs often used by temp services
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.cc']
  if (domain.length <= 8 && suspiciousTLDs.some(tld => domain.endsWith(tld))) {
    return true
  }
  
  return false
}

export function isPersonalEmail(email: string): boolean {
  const personalDomains = [
    // Google
    'gmail.com', 'googlemail.com',
    // Yahoo
    'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au', 'yahoo.fr', 'yahoo.de', 'yahoo.co.in',
    'ymail.com', 'rocketmail.com',
    // Microsoft
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'hotmail.es',
    'outlook.com', 'outlook.fr', 'outlook.de', 'outlook.it', 'outlook.es',
    'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.it',
    'msn.com', 'windowslive.com',
    // Apple
    'icloud.com', 'me.com', 'mac.com',
    // AOL
    'aol.com', 'aim.com', 'verizon.net',
    // Other popular personal email providers
    'mail.com', 'email.com',
    'protonmail.com', 'proton.me', 'pm.me',
    'tutanota.com', 'tuta.io',
    'zoho.com', 'zohomail.com',
    'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch',
    'yandex.com', 'yandex.ru', 'ya.ru',
    'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
    'qq.com', '163.com', '126.com',
    'rediffmail.com', 'rediff.com',
    'fastmail.com', 'fastmail.fm',
    'hushmail.com',
    'lycos.com',
    'inbox.com',
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  return personalDomains.includes(domain)
}

