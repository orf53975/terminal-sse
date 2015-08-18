function Streamer(terminal){
	this.terminal=terminal
	this.isopen=false;

	this.open=function(url){
		var self=this;
		try {
		    self.source=new EventSource(url);
			self.isopen=true;

			self.source.addEventListener('message', function(event) {
				var data = JSON.parse(event.data);
				console.log(data);
			  	self.terminal.println('> '+data.msg);
			  
			}, false);

			self.source.addEventListener('open', function(event) {
			  self.terminal.println('> Connection was opened');
			}, false);

			self.source.addEventListener('error', function(event) {
			  if (event.eventPhase == 2) { //EventSource.CLOSED
			    self.terminal.println('> Connection was closed');
			  }
			}, false);
		}
		catch(ex) {
			this.terminal.println('> Error');
			console.log(ex);
		}
	}

	this.close=function(){
		try {
		    this.source.close();
			this.isopen=false;
		}
		catch(ex) {
			this.terminal.println('> Error');
			console.log(ex);
		}
	}

}