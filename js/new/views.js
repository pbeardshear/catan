//
//	views.js
//

// Encapsulates functionality involving dom updates
// Rather than having a single view per page, a view object
// will wrap just a single dom container that may be updated dynamically,
// and so many views will generally exist per page
var View = function (options) {
	var container;
	var _this = {
		model: options.data,
		dataType: options.data.length ? 'array' : 'object',
		attr: options.attr,
		template: options.template,
		container: $(options.el),
		displayFn: options.fn
	};
	
	// Create getter/setter
	base.accessor(this, _this);
};

View.prototype.create = function (o) {
	var template = this.get('template');
	if (template) {
		var data = o || this.get('model');
		var container = this.get('container');
		base.each(data, function (player) {
			var temp = template;
			base.each(player, function (val, field) {
				var op = '{' + field + '}';
				temp = temp.replace(op, val);
			});
			container.append(temp);
		});
	} else {
		console.error('Can\'t create view display: no template found');
	}
};

View.prototype.update = function (o) {
	var attr = this.get('attr');
	var data = (o && o.data) || this.get('model');
	var container = this.get('container');
	if (((o && o.type) || this.get('dataType')) == 'object') {
		var fn = this.get('displayFn');
		var value = fn ? fn(data) : null;
		base.each(data, function (val, field) {
			var accessor = ('[{0}="{1}"]').replace('{0}', attr).replace('{1}', field);
			var text = (value && value[field]) || val;
			var item = container.find(accessor);
			if (item && text != null) {
				item.text(text);
			}
		});
	} else {
		var self = this;
		base.each(data, function (i) {
			self.update({ data: data[i], type: 'object' });
		});
	}
};

View.prototype.destroy = function (attr, val) {
	// If attr is provided, delete all elements matching attr = val
	var container = this.get('container');
	if (attr && val) {
		var accessor = ('[{0}={1}]').replace('{0}', attr).replace('{1}', val);
		var matched = container.find(accessor).remove();
	} else {
		// Delete all dom elements in this view
		container.children().remove();
	}
};


