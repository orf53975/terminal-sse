$(function(){

	window.terminal = new Terminal('terminal',
		{
			welcome: 'Evansofts Terminal @ 12-08-2015 ',
			theme: 'interlaced'
		},
		{
		execute: function(cmd, args) {
			switch (cmd) {
				case 'stream':
					return stream(terminal,args);
				case 'clear':
					terminal.clear();
					return '';

				case 'help':
					return 'Commands: stream, clear, help, theme, ver or version<br>More help available <a class="external" href="http://github.com/SDA/terminal" target="_blank">here</a>';

				case 'theme':
					if (args && args[0]) {
						if (args.length > 1) return 'Too many arguments';
						else if (args[0].match(/^interlaced|modern|white$/)) { terminal.setTheme(args[0]); return ''; }
						else return 'Invalid theme';
					}
					return terminal.getTheme();

				case 'ver':
				case 'version':
					return '1.0.0';

				default:
					// Unknown command.
					return false;
			};
		}
	});


	var streamer=new Streamer(terminal);
	function stream(t,args){
		if(args.length < 1)
			return "An argument needed";

		if(args[0]=='open'){
			if(args.length==1)
				return "Usage > stream open url";
			streamer.open(args[1])
		}

		if(args[0]=='close'){
			streamer.close();
		}
		return 'Please hold ...';
	}


});
