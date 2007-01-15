// 
var extCustomScripts = [];
var extCustomScriptsTemp;
var gExtContextWindow = null;
 
// static class "ExtFunc" 
var ExtFunc = {
	
	// �����l�̐ݒ� 
	service : ExtService,
	utils   : ExtCommonUtils,

	runningAutoExec   : false,
	jumpingNavigation : false,

	XHTMLNS : 'http://www.w3.org/1999/xhtml',
	XLinkNS : 'http://www.w3.org/1999/xlink',
	XULNS   : 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
	EXNS    : 'http://piro.sakura.ne.jp/ctxextensions',
 
//=========================== Executable Functions ============================
// �@�\ 
	
	// �u Extensions �v�̃��j���[���� 
	doCommand : function(aCommandName, aWindow)
	{
		var w = aWindow || this.service.contentWindow();
		var uri;

		switch (aCommandName.toLowerCase())
		{

		case 'jspanel':
			this.service.openDialog(this.service.content+'JSPanel/JSPanel.xul', 'ctxextensions:JSPanel');
			break;

		case 'linkslist': this.getLinks(null, w); break;

		case 'openselectionasuri':
			uri = this.service.getSelection();
			if (!uri) return;

			uri = this.utils.makeURIComplete(uri, this.service.currentURI());

			this.service.loadURI(uri, null, this.utils.getPref('ctxextensions.showResultIn.openSelectionAsURI'));
			break;


		// �s�����̉���

		case 'showcomments': this.showComment(w); break;
		case 'showlinks':    this.showLink(w); break;
		case 'showids':      this.showID(w); break;
		case 'showcites':    this.showCite(w); break;
		case 'showtitles':   this.showTitle(w); break;
		case 'showevents':   this.showEventHandler(w); break;
		case 'showall':
			if (this.utils.getPref('ctxextensions.showall_enable.showLinks')) this.showLink(w);
			if (this.utils.getPref('ctxextensions.showall_enable.showComments')) this.showComment(w);
			if (this.utils.getPref('ctxextensions.showall_enable.showTitles')) this.showTitle(w);
			if (this.utils.getPref('ctxextensions.showall_enable.showEvents')) this.showEventHandler(w);
			if (this.utils.getPref('ctxextensions.showall_enable.showIDs')) this.showID(w);
			if (this.utils.getPref('ctxextensions.showall_enable.showCites')) this.showCite(w);
			break;


		// ���̃f�B���N�g����
		case 'up':
			uri = w.location.href;
			uri = uri.split('#')[0];
			uri = (ExtService.canUp && uri.match(/\/(index[^\/]*)?$/i)) ? ExtService.getParentDir(uri) : ExtService.getCurrentDir(uri) ;
			this.service.loadURI(uri/*, this.utils.makeURIFromSpec(w.location.href)*/, null, this.utils.getPref('ctxextensions.showResultIn.up')); // HTTP_REFERER must not be sent when the URI doesn't exist in the original document (RFC2616 14.36)
			break;

		case 'openciteforquote':
			uri = this.service.getCiteForQuote();
			if (!uri) return;
			this.service.loadURI(uri, this.utils.makeURIFromSpec(this.service.currentURI()), this.utils.getPref('ctxextensions.showResultIn.openCiteForQuote'));
			break;
		case 'openciteforedit':
			uri = this.service.getCiteForEdit();
			if (!uri) return;
			this.service.loadURI(uri, this.utils.makeURIFromSpec(this.service.currentURI()), this.utils.getPref('ctxextensions.showResultIn.openCiteForEdit'));
			break;
		case 'openlongdesc':
			uri = this.service.getLongdesc();
			if (!uri) return;
			this.service.loadURI(uri, this.utils.makeURIFromSpec(this.service.currentURI()), this.utils.getPref('ctxextensions.showResultIn.openLongdesc'));
			break;


		case 'pref':
			window.openDialog(
				'chrome://ctxextensions/content/pref/prefDialog.xul',
				'ExtPrefWindow',
				'chrome,all,dependent');
			break;


		default: break;
		}
		return;
	},
 
	// �A�E�g���C�� 
	Outline : function(aEvent)
	{
		var i = parseInt(aEvent.target.value);
		var info = this.service.contentInfo();
		this.service.scrollTo(info.headings[i].node);
		info.headingsCurrentIndex = i;
		aEvent.stopPropagation();
		return;
	},
 
	// �i�r�Q�[�V���� 
	Navigations : function(aEvent)
	{
		var uri = aEvent.target.value;
		this.service.loadURI(uri, this.utils.makeURIFromSpec(this.service.currentURI()), this.utils.getPref('ctxextensions.showResultIn.navigations'));
		aEvent.stopPropagation();
	},
 
	// �s�����̕\�� 
	
	showInvisibleInfo : function(aXPath, aCallBackFunc, aWindow) 
	{
		var d = (aWindow ? aWindow.document : this.service.contentDocument());

		this.applyStyleForShowItems(aWindow);

		var nodes = this.utils.getNodesFromXPath(aXPath, d.documentElement);
		var max = nodes.snapshotLength;
		for (var i = 0; i < max; i++)
			aCallBackFunc(nodes.snapshotItem(i));
	},
 
	// �R�����g�̉��� 
	showComment : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::comment()',
			this.makeCommentStrings,
			aWindow
		);
	},
	makeCommentStrings : function(aNode)
	{
		if (aNode.ex_comment_visible) return;

		aNode.ex_comment_visible = true;

		var output = document.createElementNS(ExtService.EXNS, 'comment');
		output.appendChild(document.createTextNode(ExtService.message.comment.replace(/%s/i, aNode.nodeValue)));
		output.ext_generated = true;

		aNode.parentNode.insertBefore(output, aNode);
	},
 
	// �����N��̉��� 
	showLink : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::*[(@href or @longdesc) and not(@ex_link_visible)]',
			this.makeLinkStrings,
			aWindow
		);
	},
	makeLinkStrings : function(aNode)
	{
		aNode.setAttribute('ex_link_visible', true);

		var href = ('href' in aNode && aNode.href) ? aNode.href :
				aNode.getAttributeNS(ExtService.XHTMLNS, 'href') ||
				aNode.getAttributeNS(ExtService.XLinkNS, 'href') ||
				'' ;

		if (href) {
			var hrefLabel = ExtService.message.href.replace(/%s/i, href.replace(aNode.baseURI, ''));

			var output_href = document.createElementNS(ExtService.EXNS, 'linkandanchor');
			output_href.appendChild(document.createTextNode(hrefLabel));
			output_href.ext_generated = true;

			if (aNode.firstChild)
				aNode.appendChild(output_href);
			else
				aNode.parentNode.insertBefore(output_href, aNode);
		}

		var longdesc = ('longdesc' in aNode && aNode.longdesc) ? aNode.longdesc :
				aNode.getAttributeNS(ExtService.XHTMLNS, 'longdesc') ||
				'' ;

		if (longdesc) {
			var longdescLabel = ExtService.message.longdesc.replace(/%s/i, longdesc.replace(aNode.baseURI, ''));

			var output_longdesc = document.createElementNS(ExtService.EXNS, 'linkandanchor');
			output_longdesc.setAttributeNS(ExtService.XLinkNS, 'xlink:type', 'simple');
			output_longdesc.setAttributeNS(ExtService.XLinkNS, 'xlink:href',  longdesc);
			output_longdesc.setAttributeNS(ExtService.XLinkNS, 'xlink:title', longdesc);
			output_longdesc.appendChild(document.createTextNode(longdescLabel));
			output_longdesc.ext_generated = true;

			if (aNode.firstChild)
				aNode.appendChild(output_longdesc);
			else
				aNode.parentNode.insertBefore(output_longdesc, aNode);
		}
	},
 
	// id/name�̉��� 
	showID : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::*[(@id or @name) and not(@ex_id_visible)]',
			this.makeIdStrings,
			aWindow
		);
	},
	makeIdStrings : function(aNode)
	{
		aNode.setAttribute('ex_id_visible', true);
		if (!aNode.id && !aNode.name) return;

		var label_inner = aNode.id || aNode.name ;
		var label = ExtService.message.id.replace(/%s/i, aNode.id || aNode.name) ;
		var output = document.createElementNS(ExtService.EXNS, 'id');
		output.setAttributeNS(ExtService.XLinkNS, 'xlink:type', 'simple');
		output.setAttributeNS(ExtService.XLinkNS, 'xlink:href', '#'+label_inner);
		output.appendChild(document.createTextNode(label));
		output.ext_generated = true;

		if (aNode.firstChild)
			aNode.insertBefore(output, aNode.firstChild);
		else
			aNode.parentNode.insertBefore(output, aNode);
	},
 
	// cite�̉��� 
	showCite : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::*[(@cite or @longdesc) and not(@ex_cite_visible)]',
			this.makeCiteStrings,
			aWindow
		);
	},
	makeCiteStrings : function(aNode)
	{
		aNode.setAttribute('ex_cite_visible', true);
		if (!aNode.cite && !aNode.getAttributeNS(ExtService.XHTMLNS, 'longdesc')) return;

		var cite = ('cite' in aNode && aNode.cite) ? aNode.cite :
					aNode.getAttributeNS(ExtService.XHTMLNS, 'longdesc') ;
		var label = (/ins|del/i.test(aNode.localName)) ? ExtService.message.cite_edit : ExtService.message.cite ;
		label = label.replace(/%s/i, aNode.title || cite.replace(aNode.baseURI, ''));

		var output = document.createElementNS(ExtService.EXNS, 'citedfrom');
		output.setAttributeNS(ExtService.XLinkNS, 'xlink:type', 'simple');
		output.setAttributeNS(ExtService.XLinkNS, 'xlink:href',  cite);
		output.setAttributeNS(ExtService.XLinkNS, 'xlink:title', cite);
		output.appendChild(document.createTextNode(label));
		output.ext_generated = true;

		aNode.appendChild(output);
	},
 
	// title/summary�̉��� 
	showTitle : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::*[(@title or @summary or @alt) and not(@ex_title_visible)]',
			this.makeTitleStrings,
			aWindow
		);
	},
	makeTitleStrings : function(aNode)
	{
		aNode.setAttribute('ex_title_visible', true);
		if (!aNode.title && !aNode.alt && !aNode.getAttributeNS(ExtService.XHTMLNS, 'longdesc')) return;

		var title = ('title' in aNode && aNode.title) ? aNode.title :
				aNode.getAttributeNS(ExtService.XHTMLNS, 'title') ||
				aNode.getAttributeNS(ExtService.XLinkNS, 'title') ||
				'' ;
		var summary = ('summary' in aNode && aNode.summary) ? aNode.summary :
				aNode.getAttributeNS(ExtService.XHTMLNS, 'summary') ||
				'' ;
		var alt = ('alt' in aNode && aNode.alt) ? aNode.alt :
				aNode.getAttributeNS(ExtService.XHTMLNS, 'alt') ||
				'' ;

		if (title && (summary || alt)) title += '/';
		if (summary && alt) summary += '/';
		var label = ExtService.message.title.replace(/%s/i, title+summary+alt);

		var output = document.createElementNS(ExtService.EXNS, 'explanation');
		output.appendChild(document.createTextNode(label));
		output.ext_generated = true;

		if (aNode.firstChild || !aNode.parentNode)
			aNode.insertBefore(output, aNode.firstChild);
		else
			aNode.parentNode.insertBefore(output, aNode);
	},
 
	// �C�x���g���e�̉��� 
	showEventHandler : function(aWindow)
	{
		this.showInvisibleInfo(
			'/descendant::*[not(@ex_event_visible)][attribute::*[starts-with(local-name(), "ON") or starts-with(local-name(), "on")]]',
			this.makeEventStrings,
			aWindow
		);
	},
	makeEventStrings : function(aNode)
	{
		aNode.setAttribute('ex_event_visible', true);

		var attr = aNode.attributes;
		var output = document.createElementNS(ExtService.EXNS, 'event');
		var label, value;
		for (var i = 0; i < attr.length; i++)
		{
			if (attr[i].name.toLowerCase().substring(0, 2) != 'on') continue;

			label = document.createElementNS(ExtService.EXNS, 'eventlabel');
			label.appendChild(document.createTextNode(attr[i].name+':'));

			value = document.createElementNS(ExtService.EXNS, 'eventvalue');
			value.appendChild(document.createTextNode(attr[i].value));

			output.appendChild(label);
			output.appendChild(value);
		}

		output.ext_generated = true;

		if (aNode.firstChild)
			aNode.insertBefore(output, aNode.firstChild);
		else if (aNode.nextSibling)
			aNode.parentNode.insertBefore(output, aNode.nextSibling);
		else
			aNode.parentNode.appendChild(output);
	},
  
	// �X�^�C���V�[�g�I��/�ǉ��K�p 
	ApplyStyle : function(aEventOrID, aShouldSave, aWindow)
	{
		if (typeof aEventOrID != 'string' &&
			'stopPropagation' in aEventOrID) {
			aEventOrID.stopPropagation();
			if (aEventOrID.altKey || aEventOrID.ctrlKey || aEventOrID.metaKey)
				return this.service.editRDFItem(aEventOrID, 'StyleSheets');
		}

		var w    = (aWindow ? aWindow : this.service.contentWindow() );
		var d    = w.document,
			info = this.service.contentInfo(false, w);

		var id,
			target = null,
			value  = null;

		if (typeof aEventOrID == 'string') {
			id = aEventOrID;
		}
		else {
			target = aEventOrID.target;
			id     = target.getAttribute('styleid');
		}


		if (id == 'ext-common-userContentCSSEditor') {
			this.editUserContentCSS();
		}
		else if (id == 'ext-common-customUserStyleEditor') {
			this.service.openDialog(this.service.content+'styleSheetsManager/customUserStyleEditor.xul', 'ctxextensions:customUserStyleEditor');
		}
		else if (target ? (target.getAttribute('type') == 'radio') : id.match(/^ext_(style:|system)/)) {
			var path = this.utils.getCurrentDir(w.location.href);
			var old  = this.utils.SELECTEDSTYLES.getDataFromPath(path, 'SelectedStyle');
			value = target ? target.getAttribute('value') : id.replace(/^ext_style:/, '') ;

			if (old != value && aShouldSave) {
				this.utils.SELECTEDSTYLES.setData(path, 'Path', path, 'SelectedStyle', value);
				this.utils.SELECTEDSTYLES.setData(path, 'Path', path, 'SelectedStyleID', id);
			}

			// �S�ẴX�^�C���V�[�g�������A���邢�́A�i���X�^�C���V�[�g�̂ݓK�p
			if (id == 'ext_system_onlyPermanence') value = null;
			if (id == 'ext_system_noStyle')
				this.cancelStyles();
			else
				this.service.setStyleTo(value, w.top, true);
		}
		else {
			var idAttrString = escape(id).replace(/%/g, '-');
			// check selected status
			var checked = gBrowser.selectedTab.hasAttribute('ctxextensions-optionalstylesheet-'+idAttrString) ?
				(gBrowser.selectedTab.getAttribute('ctxextensions-optionalstylesheet-'+idAttrString) == 'true') :
				(this.utils.STYLESHEETS.getData(id, 'Selected') == 'true');

			// ��Ԃ�ۑ�
			if (aShouldSave)
				gBrowser.selectedTab.setAttribute('ctxextensions-optionalstylesheet-'+idAttrString, !checked ? 'true' : 'false' );

			// for preset items
			if (typeof aEventOrID != 'string') {
				value = aEventOrID.target.getAttribute('value');
			}

			this.toggleOptionalStyleRules(id, value, w);
		}

		return true;
	},
	
	// userContent.css �̕ҏW 
	editUserContentCSS : function()
	{
		var editor = this.utils.getPref('ctxextensions.override.CSSEditor.path');
		if (editor) {
			var path = this.utils.userContentCSSFile.path;

			var options = this.utils.getPref('ctxextensions.override.CSSEditor.options');
			options = (options.match(/%s/i)) ? options.replace(/%s/ig, path) :
					(options) ? path+' '+options :
					path ;

			this.service.run(editor, options);
		}
		else
			this.utils.goStyleSheetsManager(0);
	},
 
	// �S�ẴX�^�C�������� 
	cancelStyles : function(aWindow)
	{
		var d = (aWindow ? aWindow.document : this.service.contentDocument()),
			contentStyles = d.styleSheets,
			nodes    = d.getElementsByTagName('*');
		var i;

		for (i = 0; i < contentStyles.length; i++)
			contentStyles[i].disabled = true;

		for (i = 0; i < nodes.length; i++)
			if (!('ext_generated' in nodes[i]))
				nodes[i].removeAttribute('style');
		return;
	},
 
	toggleOptionalStyleRules : function(aID, aRules, aWindow, aForcedSetOrUnset) 
	{
		var d    = (aWindow ? aWindow.document : this.service.contentDocument() ),
			w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);
		var id   = 'UserdefinedStyleSheet:'+aID+':'+d.URL;

		if (!('sheet' in info)) info.sheet = [];


		// if the flag to force to set/unset style is different from current stored status of data, save new status

		// check selected status
		var idAttrString = escape(aID).replace(/%/g, '-');
		var checked = gBrowser.selectedTab.hasAttribute('ctxextensions-optionalstylesheet-'+idAttrString) ?
			(gBrowser.selectedTab.getAttribute('ctxextensions-optionalstylesheet-'+idAttrString) == 'true') :
			(this.utils.STYLESHEETS.getData(aID, 'Selected') == 'true');

		if (aForcedSetOrUnset !== void(0) && checked != aForcedSetOrUnset) {
			gBrowser.selectedTab.setAttribute('ctxextensions-optionalstylesheet-'+idAttrString, aForcedSetOrUnset ? 'true' : 'false' );
			checked = aForcedSetOrUnset;
		}


		if (this.utils.STYLESHEETS.getData(aID, 'Cancel') == 'true')
			this.cancelStyles();

		if ((aForcedSetOrUnset === void(0) || !aForcedSetOrUnset) &&
			id in info.sheet && info.sheet[id]) {
			info.sheet[id].disabled = !checked;
		}
		else { // append stylesheet
			if (id in info.sheet && info.sheet[id]) return;

			var rules = this.utils.unescape(this.utils.STYLESHEETS.getData(aID, 'StyleRules'));

			// �v���Z�b�g�̍��ڂ̓X�^�C�����[���𒼐ړn�����̂ŁA������o�b�N�A�b�v����B
			// �܂��A�v���Z�b�g�̓��e���o�[�W�����A�b�v�ȂǂŕύX���ꂽ�ꍇ�́A�ۑ����ꂽ�f�[�^���X�V����B
			if ((!rules && aRules) ||
				(rules && aRules && rules != aRules)) {
				rules = aRules;
				this.utils.STYLESHEETS.setData(aID, 'StyleRules', this.utils.unescape(aRules));
			}

			var path  = 'about:'+escape(id);
			if (/^\s*@import\s+(url\()?("|')?.+("|')?\);\s*$/.test(rules)) {
				path = rules.replace(/^\s*@import\s+(url\()?("|')?/, '').replace(/("|')?\)?;\s*$/, '');
				rules = '';
			}

			this.service.appendStyleSheet(id, path, w, rules);
		}
	},
 
	OpenStyleSheetSource : function(aEventOrID, aWindow) 
	{
		var i,
			name,
			value    = [],
			embedded = [];

		if (aEventOrID &&
			typeof aEventOrID != 'string' &&
			'stopPropagation' in aEventOrID) {
			aEventOrID.stopPropagation();
			name        = aEventOrID.target.label;
			embedded[0] = aEventOrID.target.getAttribute('embeddedSheet');
			value[0]    = embedded[0] ? this.utils.unescape(aEventOrID.target.getAttribute('embeddedSheet')) : aEventOrID.target.value ;
		}
		else {
			var d = (aWindow ? aWindow.document : this.service.contentDocument()),
				sheets = d.styleSheets;

			name = aEventOrID || d.title;

			for (i = 0; i < sheets.length; i++)
				if (sheets[i].title == aEventOrID ||
					(!aEventOrID && !sheets[i].title)) {
					embedded.push(false);
					value.push(sheets[i].href);
					if (value[i] == d.URL) {
						embedded[embedded.length-1] = true;
						value[value.length-1] = sheets[i].ownerNode.firstChild.nodeValue;
					}
				}
		}

		if (!value) return;


		var ref = this.utils.makeURIFromSpec(aWindow ? aWindow.location.href : this.service.currentURI() );

		for (i in value)
		{
			if (embedded[i]) {
				window.openDialog('chrome://ctxextensions/content/pref/prefProperty.xul', '_blank', 'chrome,all,dialog=no,centerscreen',
					{
						name        : name+(i == 0 ? '' : '('+i+')'),
						editorValue : value[i]
					},
					'viewerMode'
				);
			}
			else {
				switch (this.utils.getPref('ctxextensions.showResultIn.styleSheets'))
				{
					default:
					case 0:
						if (i == 0) {
							this.service.openNewTab(value[i], ref);
							break;
						}

					case 10:
						this.service.loadURI(value[i], ref, this.service.NEW_TAB);
						break;

					case 11:
						this.service.loadURI(value[i], ref, this.service.NEW_BG_TAB);
						break;

					case 20:
						this.service.loadURI(value[i], ref, this.service.NEW_WINDOW);
						break;
				}
			}
		}
	},
  
	// �I�𕶎���𑗂� 
	SendStr : function(aEventOrID, aString)
	{
		if (typeof aEventOrID != 'string' &&
			'stopPropagation' in aEventOrID) {
			aEventOrID.stopPropagation();
			if (aEventOrID.altKey || aEventOrID.ctrlKey || aEventOrID.metaKey)
				return this.service.editRDFItem(aEventOrID, 'SendStr');
		}

		var id     = (typeof aEventOrID == 'string') ? aEventOrID : aEventOrID.target.getAttribute('label') ;
		var path   = this.utils.SENDSTR.getData(id, 'Path'),
			openIn = this.utils.SENDSTR.getData(id, 'OpenIn'),
			word   = aString || this.service.getSelection();

		if (!path) return true;

		var charset = this.utils.SENDSTR.getData(id, 'Charset') || this.utils.getPref('ctxextensions.sendStrCharset');

		if (!word) {
			// load history for this item
			var data = { value : this.utils.getPref('ctxextensions.history.sendStr.'+escape(id)) || '' };
			if (!this.utils.PromptService.prompt(
					window,
					this.utils.getMsg('sendStr_inputString_title').replace(/%s/gi, id),
					this.utils.getMsg('sendStr_inputString'),
					data,
					null,
					{}
				) ||
				!data.value)
				return true;

			word    = data.value;
			charset = 'UTF-8';
			this.utils.setPref('ctxextensions.history.sendStr.'+escape(id), word);
		}

		// Unicode ����w�肳�ꂽ�����R�[�h�֕ϊ�
		if (charset != 'UTF-8') {
			this.utils.UCONV.charset = charset;
			word = this.utils.UCONV.ConvertFromUnicode(word);
			word = this.utils.byteEscape(word); // escape()�ł͕�����������P�[�X������
		}
		else
			word = encodeURI(word);

		// word �ł͂Ȃ� escape(word) ��n���Ȃ��ƁA�Ȃ񂩂悤�킩��񂯂Ǐ���Ƀw���ȃR�[�h�ɕϊ������B
		var uri = (!path.match(/%s/i)) ? path+word : path.replace(/%s/gi, word) ;

		switch(openIn)
		{
			case 'NewWindow':
				this.service.loadURI(uri, null, this.service.NEW_WINDOW);
				break;
			case 'NewTab':
				this.service.openNewTab(uri, null, this.service.NEW_TAB);
				break;
			case 'NewBackgroundTab':
				this.service.openNewTab(uri, null, this.service.NEW_BG_TAB);
				break;
			default:
				this.service.loadURI(uri);
				break;
		}

		return true;
	},
 
	// URI�𑗂� 
	SendURI : function(aEventOrID, aShouldOpenTopFrame, aURI)
	{
		if (typeof aEventOrID != 'string' &&
			'stopPropagation' in aEventOrID) {
			aEventOrID.stopPropagation();
			if (aEventOrID.altKey || aEventOrID.ctrlKey || aEventOrID.metaKey)
				return this.service.editRDFItem(aEventOrID, 'SendURI');
		}

		var id     = (typeof aEventOrID == 'string') ? aEventOrID : aEventOrID.target.getAttribute('label') ;
		var path   = this.utils.SENDURI.getData(id, 'Path'),
			openIn = this.utils.SENDURI.getData(id, 'OpenIn'),
			encode = this.utils.SENDURI.getData(id, 'Encode'),
			uri    = aURI || this.service.contextualURI(aShouldOpenTopFrame);

		if (!path) return true;

		if (encode == 'true') uri = escape(uri);

		uri = (!path.match(/%s/i)) ? path+uri : path.replace(/%s/gi, uri) ;

		switch(openIn)
		{
			case 'NewWindow':
				this.service.loadURI(uri, null, this.service.NEW_WINDOW);
				break;
			case 'NewTab':
				if (this.utils.browserWindow.ExtService.currentURI(true) != 'about:blank') {
					this.service.openNewTab(uri, null, this.service.NEW_TAB);
					break;
				}
			case 'NewBackgroundTab':
				if (this.utils.browserWindow.ExtService.currentURI(true) != 'about:blank') {
					this.service.openNewTab(uri, null, this.service.NEW_BG_TAB);
					break;
				}
				break;
			default:
				this.service.loadURI(uri);
				break;
		}

		return true;
	},
 
	// �O���A�v���A�g�i Execute Applications �j 
	ExecApps : function(aEventOrID, aShouldOpenTopFrame, aURI, aString)
	{
		if (typeof aEventOrID != 'string' &&
			'stopPropagation' in aEventOrID) {
			aEventOrID.stopPropagation();
			if (aEventOrID.altKey || aEventOrID.ctrlKey || aEventOrID.metaKey)
				return this.service.editRDFItem(aEventOrID, 'ExecApps');
		}

		var id    = (typeof aEventOrID == 'string') ? aEventOrID : aEventOrID.target.getAttribute('label') ;
		var path  = this.utils.EXECAPPS.getData(id, 'Path'),
			arg   = this.utils.EXECAPPS.getData(id, 'Arguments'),
			down  = (this.utils.EXECAPPS.getData(id, 'Download') == 'true'),
			uri   = aURI || this.service.contextualURI(aShouldOpenTopFrame);

		arg = (!arg) ? arg = '' : arg.replace(/\[URI\]/i, '%s') ;

		if (arg.match(/%c/i)) {
			var str = aString || this.service.getSelection() || '' ;
			arg = arg.replace(/%c/ig, str);

			// Unicode ����w�肳�ꂽ�����R�[�h�֕ϊ�
			var charset = this.utils.EXECAPPS.getData(id, 'Charset') || this.utils.getPref('ctxextensions.sendStrCharset');
			if (charset != 'UTF-8') {
				this.utils.UCONV.charset = charset;
//				str = this.utils.UCONV.ConvertFromUnicode(str);
				arg = this.utils.UCONV.ConvertFromUnicode(arg);
			}
//			arg = arg.replace(/%c/ig, str);
		}

		var d = this.service.contentDocument(aShouldOpenTopFrame);
		if (down || d.URL.match(/^(chrome|resource|data):/)) {
			if (!d.location || d.URL != uri) d = null;
			this.service.downloadAndOpenWithApp('EXECAPP:'+path, path, arg, uri, d);
		}
		else
			this.service.run(path, arg.replace(/%s/gi, uri));

		return true;
	},
 
	// �J�X�^���X�N���v�g 
	CustomScripts : function(aEventOrID, aScript, aWindow)
	{
		if (aEventOrID && typeof aEventOrID == 'object') { //event
			aEventOrID.stopPropagation();
			if (aEventOrID.altKey || aEventOrID.ctrlKey || aEventOrID.metaKey)
				return this.service.editRDFItem(aEventOrID, 'CustomScripts');
		}

		var script = aScript;
		var id = '_anonymous';

		if (aEventOrID) {
			if (typeof aEventOrID == 'string') {
				id = aEventOrID;
				if (!script)
					script = ExtCommonUtils.unescape(ExtCommonUtils.CUSTOMSCRIPTS.getData(aEventOrID, 'Script'));
			}
			else {
				if (ExtService.isEventSentFromTextFields(aEventOrID) ||
					ExtService.isFindTypeAheadActive()) return true;
				id = aEventOrID.target.getAttribute('label');
				if (!script)
					script = ExtCommonUtils.unescape(ExtCommonUtils.CUSTOMSCRIPTS.getData(id, 'Script'));
			}
		}

		if (!script) return true;

		// �J�X�^���X�N���v�g���Ŏg�p�ł���Z�k�\��
		var w = aWindow || ExtService.contentWindow();

		gExtContextWindow = w;

		// heading��navigations���Q�Ƃ��Ă���ꍇ�A���X�g���X�V
		if (script.match(/headings/)) {
			ExtService.updateHeadings(w);
			w.document.headings = w.document.__mozInfo__.headings;
		}
		if (script.match(/navigations/)) {
			ExtService.updateNavigations(w);
			w.document.navigations = w.document.__mozInfo__.navigations;
		}

		try {
			// window�I�u�W�F�N�g�̃��\�b�h�ɂ���
			eval(['window.extCustomScripts[id] = function() { with(window) {', script, '} }'].join('\n\r'));
			return window.extCustomScripts[id]();
//			delete window.extCustomScripts[id];
//			return ret;
		}
		catch(e) {
			alert(e);
		}

		return true;
	},
 
	// �����N�ꗗ���R�s�[���� 
	getLinks : function(aRegExp, aWindow, aShouldNotCopy)
	{
		var links = this.service.getLinksArray(aRegExp, aWindow, true);

		var ret = [];
		for (var i in links)
			ret.push(links[i].uri);

		if (!aShouldNotCopy)
			this.utils.setStringToClipBoard(ret.join('\n')+'\n');

		return ret;
	},
 
	// ���o���ԃW�����v 
	goHeadings : function(aTarget, aEvent, aWindow)
	{
		if (this.service.isEventSentFromTextFields(aEvent) ||
			this.service.isFindTypeAheadActive()) return;

		this.service.updateHeadings(aWindow);

		var d    = (aWindow ? aWindow.document : this.service.contentDocument()),
			w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);
		if (!info.headings || !info.headings.length) return;

		// �A���J�[���猻�݂̌��o�����擾�B�擾�ł��Ȃ���΁A�����̒l����B
		var uri     = d.URL.split('#');
		var current =
			(uri[1] &&
			info.headingsIndex &&
			info.headingsIndex[uri[1]] !== void(0) &&
			info.headingsCurrentIndex < 0)
				? info.headingsIndex[uri[1]] : info.headingsCurrentIndex ;

		switch (aTarget.toLowerCase())
		{
			case 'next':
				if (current < info.headings.length-1) current++;
				else current = 0;
				break;
			case 'prev':
				if (current > 0) current--;
				else current = info.headings.length-1;
				break;
			default:
				break;
		}

		this.service.scrollTo(info.headings[current].node);
		info.headingsCurrentIndex = current;

		return;
	},
 
	// �t�H�[�J�X���ړ� 
	advanceFocus : function(aDir, aEvent)
	{
		if (aEvent &&
			(
			this.service.isEventSentFromTextFields(aEvent) ||
			this.service.isFindTypeAheadActive()
			)
			) return;

		var d = this.service.contentDocument();
		var dispatcher = document.commandDispatcher;
		if (!dispatcher.focusedElement) {
			dispatcher.advanceFocusIntoSubtree(d.documentElement);
			// advanceFocusIntoSubtree�̓J�����g�m�[�h�̎��ɂ��郊���N�ȂǂɃt�H�[�J�X����B
			if (aDir > 0) return;
		}

		var focusedNode = dispatcher.focusedElement;
		try {
			focusedNode.blur();
		}
		catch(e) {
		}

		var walker = d.createTreeWalker(d, NodeFilter.SHOW_ELEMENT, this.getFocusFilter, false);
		walker.currentNode = focusedNode;

		var next = (aDir > 0) ? walker.nextNode() : walker.previousNode() ;
		if (!next) {
			if (aDir > 0) { // move to the first node
				walker.currentNode = walker.root;
				walker.nextNode();
			}
			else
				while(walker.nextNode()) // move to the last node
				{
				}

			next = walker.currentNode;
		}

		if (next) next.focus();
	},
	getFocusFilter :
	{
		acceptNode : function(aNode)
		{
			return (
					!('focus' in aNode) || !aNode.focus ||
					typeof aNode.focus != 'function' ||
					!('offsetParent' in aNode) // hidden elements
					) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT ;
		}
	},
 
	// Site Navigation Toolbar�̓��e�ɃW�����v 
	goNavigation : function(aType, aEvent, aNode)
	{
		if (this.jumpingNavigation ||
			this.service.isEventSentFromTextFields(aEvent) ||
			this.service.isFindTypeAheadActive()) return;

		this.service.updateNavigationsPopup(false, aType);
		var popup = document.getElementById('ext-common-navigationsSelect:mpopup'),
			nodes = document.getElementById('ext-common-navigations:mpopup').getElementsByAttribute('ext-navigation-'+aType, 'true');

		if (!nodes.length) {
//			window.status = this.utils.getMsg('error_gotoLink_noitem').replace(/%s/i, this.utils.getMsg('link_'+aType));
			return;
		}

		this.jumpingNavigation = true;
		try {
			var i,
				menuitem;
			if (nodes.length > 1 &&
				this.utils.getPref('ctxextensions.enable.navigations_submenu') &&
				!aNode)
			{
				// ���������N�^�C�v���������N����ȏ゠��ꍇ�A�|�b�v�A�b�v�őI��

				var range = document.createRange();
				range.selectNodeContents(popup);
				range.deleteContents();
				range.detach();

				for (i = 0; i < nodes.length; i++)
				{
					menuitem = document.createElement('menuitem');

					menuitem.setAttribute('id', 'ext-navigationsSelect:item:'+aType);
					menuitem.setAttribute('label', nodes[i].getAttribute('label'));
					menuitem.setAttribute('originalLabel', nodes[i].getAttribute('originalLabel'));
					menuitem.setAttribute('accesskey', (i < 26+9) ? (i+1).toString(26+9) : '');
					menuitem.setAttribute('value', i);
					menuitem.setAttribute('oncommand', 'ExtFunc.goNavigation(\''+aType+'\', event, this);');

					popup.appendChild(menuitem);
				}

				this.service.showPopup(popup, window.screenX+20, window.screenY+40);
		//		var x = window.screenX+(window.outerWidth/4);
		//		var y = window.screenY+(window.outerHeight/5);

			}
			else {
				i = aNode ? aNode.getAttribute('value') : 0 ;
				i = i ? Number(i) : 0 ;

				var destURL = nodes[i].getAttribute('value');
				try {
					// �Z�L�����e�B�`�F�b�N
					const ssm = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService().QueryInterface(Components.interfaces.nsIScriptSecurityManager);
					ssm.checkLoadURIStr(window.content.location.href, destURL, 0);
					window.loadURI(destURL, this.utils.makeURIFromSpec(this.service.currentURI()));
				}
				catch (e) {
					dump('Error: it is not permitted to load this URI from a <link> element: ' + e);
				}

			}
		}
		catch(e) {alert(e);
		}

		this.jumpingNavigation = false;
		return;
	},
 
	// ���j���[���|�b�v�A�b�v 
	showMenu : function(aNode)
	{
		var type    = aNode.id.split(':')[1],
			index   = (aNode.id.split(':').length > 2) ? parseInt(aNode.id.split(':')[2]) : -1 ,
			popupId = (type.match(/^(navigations|outline|styleSheets|customScripts|execApps)$/)) ? 'ext-common-'+type+':mpopup' : null ;

		if (popupId &&
			!this.utils.getPref('ctxextensions.submenu.menubar.'+type))
			popupId = 'menu-item-'+type+':mpopup';


		var popup = (index < 0) ? document.getElementById(popupId) :
					document.getElementById('main-menubar').childNodes[index].firstChild ;

		// bookmarks
		if (index > -1 && popup.localName != 'menupopup')
			popup = popup.parentNode.lastChild;

		switch (type)
		{
			case 'navigations':
				this.service.updateNavigationsPopup();
				break;

			case 'outline':
				this.service.updateOutlinePopup();
				break;

			case 'styleSheets':
				this.service.updateStyleSheetsPopup();
				break;

			case 'execApps':
				break;

			case 'menu':
				var menubar = popup.parentNode.parentNode;
				for (var i = 0; i < menubar.childNodes.length; i++)
					menubar.childNodes[i].hidden = (menubar.childNodes[i] != popup.parentNode);
				break;

			default:
				break;
		}

		if (type.match(/^(navigations|outline|styleSheets)$/) &&
			!this.utils.getPref('ctxextensions.submenu.menubar.'+type)) {
			popup.showPopup();
			return;
		}


		if (!popup.childNodes.length) {
//			window.status = this.utils.getMsg('error_showMenu_noitem').replace(/%s/i, this.utils.getMsg('menu_'+type));
			return;
		}

		this.service.showPopup(popup, window.screenX+20, window.screenY+40);
//		var x = window.screenX+(window.outerWidth/4);
//		var y = window.screenY+(window.outerHeight/5);

		return;
	},
	
	toggleMenubar : function() 
	{
		this.service.updateKey();
		var menubar = document.getElementById('main-menubar');
		for (var i = 0; i < menubar.childNodes.length; i++)
			menubar.childNodes[i].hidden = false;
		return;
	},
   
	// �������s 
	
	// �s�����\���̎������s 
	AutoExecShow : function(aWindow)
	{
		var d = (aWindow ? aWindow.document : this.service.contentDocument());
		if (!d) return; // failsafe

		var w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);
		if ('showAutoFinished' in info) return;

		var prefs = {
				showComments : 'showComment',
				showLinks    : 'showLink',
				showIDs      : 'showID',
				showCites    : 'showCite',
				showTitles   : 'showTitle',
				showEvents   : 'showEventHandler'
			};

		for (var i in prefs)
			if (this.utils.getPref('ctxextensions.autoexec.'+i)) {
				this[prefs[i]](aWindow);
				info.showAutoFinished = true;
			}

		return;
	},
 
	// �J�X�^���X�N���v�g�̎������s 
	AutoExecCS : function(aWindow)
	{
		var d = (aWindow ? aWindow.document : this.service.contentDocument());
		if (!d) return; // failsafe

		var w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);
		if ('execautoFinished' in info ||
			!this.utils.getPref('ctxextensions.autoexec.customScripts')) return;

		var CSObj = this.utils.CUSTOMSCRIPTS,
			item,
			ret;
		for (var i = 0; i < CSObj.length; i++)
		{
			item = CSObj.item(i);
			if (CSObj.getData(item, 'Automatically') == 'true')
				ret = this.CustomScripts(CSObj.getData(item, 'Name'), null, w);
		}

		info.execautoFinished = true;

		return;
	},
  
	// �X�^�C���V�[�g�̏��� 
	
	// �ǉ��̃X�^�C���V�[�g��K�p 
	AddOptionalStyleSheets : function(aWindow)
	{
		var d    = (aWindow ? aWindow.document : this.service.contentDocument()),
			w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);

		if ('addOptionalStyleSheetsDone' in info) return;

		var SSObj = this.utils.STYLESHEETS,
			item,
			name,
			idAttrString;

		for (var i = 0; i < SSObj.length; i++)
		{
			item = SSObj.item(i);
			if (!item) continue;

			name = SSObj.getID(item);
			idAttrString = escape(name).replace(/%/g, '-');

			if (gBrowser.selectedTab.hasAttribute('ctxextensions-optionalstylesheet-'+idAttrString) ?
				(gBrowser.selectedTab.getAttribute('ctxextensions-optionalstylesheet-'+idAttrString) == 'true') :
				(SSObj.getData(item, 'Selected') == 'true'))
				this.toggleOptionalStyleRules(name, null, w, true);
		}

		info.addOptionalStyleSheetsDone = true;

		return;
	},
 
	// �X�^�C���؂�ւ����̓ǂݍ��݂Ɣ��f 
	RestoreSelectedStyle : function(aWindow, aRequest)
	{
		var d    = (aWindow ? aWindow.document : this.service.contentDocument()),
			w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);

		if ('restoreStyleDone' in info) return;

		var path = this.utils.getCurrentDir(d.URL);
		var style = this.utils.SELECTEDSTYLES.getDataFromPath(path, 'SelectedStyle') || '' ;
		var id = this.utils.SELECTEDSTYLES.getDataFromPath(path, 'SelectedStyleID');

		if (id == 'ext_system_noStyle')
			this.cancelStyles();
		else if (style) {
			if (id == 'ext_system_onlyPermanence') style = null;

			var done;
			try {
				var httpChannel;
				if (aRequest)
					httpChannel = aRequest.QueryInterface(Components.interfaces.nsIHttpChannel);
				if (httpChannel) {
					httpChannel.setResponseHeader('Default-Style', style, false);
					done = true;
				}
			}
			catch(e) {
			}

			// �X�^�C���̑I�������������󂯎��I�u�W�F�N�g�𐶐��B
			// �^�C�}�[�ɂ���āAdocument.styleSheets���������ꎟ�揈�����s���B
			// �ۑ�����Ă��閼�O�̃X�^�C�����Ȃ��ꍇ�A�������Ȃ�
//			var hasSavedStyle = this.service.hasStyle(d, style);
//			if (hasSavedStyle)
				this.service.selectStyleSheet(d.URL, style, w);
		}

		info.restoreStyleDone = true;

		return;
	},
 
	ApplyCustomUserStyleRules : function(aWindow) 
	{
		var w    = (aWindow ? aWindow : this.service.contentDocument().refaultView ),
			info = this.service.contentInfo(false, w);
		var uri;
		try {
			uri = Components.lookupMethod(w, 'location').call(w).href;
		}
		catch(e) {
			uri = w.location.href;
		}

		if ('customUserStyleDone' in info) return;

		var rules = this.utils.unescape(this.utils.USERSTYLES.getDataFromPath(uri, 'StyleRules'));
		if (rules) {
			this.service.appendStyleSheet('UserStyle:'+uri, 'about:blank?UserStyle', w, rules);
			info.customUserStyleDone = true;
		}
		return;
	},
 
	applyStyleForShowItems : function(aWindow) 
	{
		var d    = (aWindow ? aWindow.document : this.service.contentDocument()),
			w    = (aWindow ? aWindow : gBrowser.contentWindow ),
			info = this.service.contentInfo(false, w);

		if ('showStyleRuleDone' in info) return;

		var rules = 'comment     {\n'+this.utils.getPref('ctxextensions.style.showComments', true)+'\n}\n'+
					'id          {\n'+this.utils.getPref('ctxextensions.style.showIDs', true)+'\n}\n'+
					'linkandanchor {\n'+this.utils.getPref('ctxextensions.style.showLinks', true)+'\n}\n'+
					'citedfrom   {\n'+this.utils.getPref('ctxextensions.style.showCites', true)+'\n}\n'+
					'explanation {\n'+this.utils.getPref('ctxextensions.style.showTitles', true)+'\n}\n'+
					'eventlabel  {\n'+this.utils.getPref('ctxextensions.style.showEvents.label', true)+'\n}\n'+
					'eventvalue  {\n'+this.utils.getPref('ctxextensions.style.showEvents.value', true)+'\n}\n';

		this.service.appendStyleSheet('ShowItems:'+d.URL, this.service.content+'res/_EXNS.css?ShowItems', w, rules);
		info.showStyleRuleDone = true;
		return;
	},
  
	destruct : function() 
	{
	}
};
  
