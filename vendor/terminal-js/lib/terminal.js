(function (global, undefined) {

  var Terminal = Terminal || function(containerID, options) {
    if (!containerID) return;

    var defaults = {
      welcome: '',
      prompt: '',
      separator: '&gt;',
      theme: 'interlaced'
    };

    var options = options || defaults;
    options.welcome = options.welcome || defaults.welcome;
    options.prompt = options.prompt || defaults.prompt;
    options.separator = options.separator || defaults.separator;
    options.theme = options.theme || defaults.theme;

    var extensions = Array.prototype.slice.call(arguments, 2);

    var _history = localStorage.history ? JSON.parse(localStorage.history) : [];
    var _historySet = localStorage.historySet ? JSON.parse(localStorage.historySet) : [];
    var _histpos = _history.length;
    var _histtemp = '';

    // Create terminal and cache DOM nodes;
    var _terminal = document.getElementById(containerID);
    _terminal.classList.add('terminal');
    _terminal.classList.add('terminal-' + options.theme);
    _terminal.insertAdjacentHTML('beforeEnd', [
      '<div class="background"><div class="interlace"></div></div>',
      '<div class="container">',
      '<output></output>',
      '<table class="input-line">',
      '<tr><td nowrap><div class="prompt">' + options.prompt + options.separator + '</div></td><td width="100%"><input class="cmdline" autofocus /></td></tr>',
      '</table>',
      '</div>'].join(''));
    var _container = _terminal.querySelector('.container');
    var _inputLine = _container.querySelector('.input-line');
    var _cmdLine = _container.querySelector('.input-line .cmdline');
    var _output = _container.querySelector('output');
    var _prompt = _container.querySelector('.prompt');
    var _background = document.querySelector('.background');
    var _cmdListeners = [];

    // Hackery to resize the interlace background image as the container grows.
    _output.addEventListener('DOMSubtreeModified', function(e) {
      // Works best with the scroll into view wrapped in a setTimeout.
      setTimeout(function() {
        _cmdLine.scrollIntoView();
      }, 0);
    }, false);

    if (options.welcome) {
      _output.insertAdjacentHTML('beforeEnd', options.welcome);
      _cmdLine.scrollIntoView();
    }

    window.addEventListener('click', function(e) {
      _cmdLine.focus();
    }, false);

    _output.addEventListener('click', function(e) {
      e.stopPropagation();
    }, false);

    // Always force text cursor to end of input line.
    _cmdLine.addEventListener('click', inputTextClick, false);
    _inputLine.addEventListener('click', function(e) {
      _cmdLine.focus();
    }, false);

    // Handle up/down key presses for shell history and enter for new command.
    _cmdLine.addEventListener('keyup', historyHandler, false);
    _cmdLine.addEventListener('keydown', newCommandHandler, false);

    window.addEventListener('keyup', function(e) {
      _cmdLine.focus();
      e.stopPropagation();
      e.preventDefault();
    }, false);

    function inputTextClick(e) {
      this.value = this.value;
    }

    function historyHandler(e) {
      // Clear command-line on Escape key.
      if (e.keyCode == 27) {
        this.value = '';
        e.stopPropagation();
        e.preventDefault();
      }

      if (_history.length && (e.keyCode == 38 || e.keyCode == 40)) {
        if (_history[_histpos]) {
          _history[_histpos] = this.value;
        }
        else {
          _histtemp = this.value;
        }

        if (e.keyCode == 38) {
          // Up arrow key.
          _histpos--;
          if (_histpos < 0) {
            _histpos = 0;
          }
        }
        else if (e.keyCode == 40) {
          // Down arrow key.
          _histpos++;
          if (_histpos > _history.length) {
            _histpos = _history.length;
          }
        }

        this.value = _history[_histpos] ? _history[_histpos] : _histtemp;

        // Move cursor to end of input.
        this.value = this.value;
      }
    }

    function addToHistory(_history, newEntry) {
      // Remove repeated history entries
      if (newEntry in _historySet) {
        for (var i = _history.length-1; i >= 0; i--) {
          if (_history[i] == newEntry) {
            _history.splice(i, 1);
            break;
          }
        }
      }
      _history.push(newEntry);
      _historySet[newEntry] = true;
    }

    function newCommandHandler(e) {
      // Only handle the Enter key.
      if (e.keyCode != 13) return;

      var cmdline = this.value;

      // Save shell history.
      if (cmdline) {
        addToHistory(_history, cmdline);
        localStorage['history'] = JSON.stringify(_history);
        localStorage['historySet'] = JSON.stringify(_historySet);
        _histpos = _history.length;
      }

      // Duplicate current input and append to output section.
      var line = this.parentNode.parentNode.parentNode.parentNode.cloneNode(true);
      line.removeAttribute('id')
      line.classList.add('line');
      var input = line.querySelector('input.cmdline');
      input.autofocus = false;
      input.readOnly = true;
      input.insertAdjacentHTML('beforebegin', input.value);
      input.parentNode.removeChild(input);
      _output.appendChild(line);

      // Hide command line until we're done processing input.
      _inputLine.classList.add('hidden');

      // Clear/setup line for next input.
      this.value = '';

      // Parse out command, args, and trim off whitespace.
      var args;
      if (cmdline && cmdline.trim()) {
        var provArgs = cmdline.split(' ')

        // Parse quotes ['"]
        var realArgs = [];
        var arg = '';
        provArgs.join(' ').split('').forEach( function (letter) {
          if (letter == ' ') {
          if (arg.length) {
            if (arg[0] != '"' && arg[0] != "'") {
            realArgs.push(arg);
            arg = '';
            }
            else {
            arg += letter;
            }
          }
          }
          else if (letter == '"' || letter == "'") {
          if (arg.length && arg[0] == letter) {
            realArgs.push(arg.slice(1));
            arg = '';
          }
          else {
            arg += letter;
          }
          }
          else {
          arg += letter;
          }
        })
        realArgs.push(arg); // add what is at the end

        // Filter empty
        args = realArgs;
        args = args.filter(function(val, i) {
          return val;
        });
      }

      // Notify event listeners
      var args = args || [];
      for (var i = 0; i < _cmdListeners.length; i++) {
        var listener = _cmdListeners[i];
        if (typeof listener === 'function') {
          listener(args);
        }
      }

      var cmd = args[0]; // Get cmd.
      args = args.splice(1); // Remove cmd from arg list.

      if (cmd) {
        var response = false;
        for (var index in extensions) {
          var ext = extensions[index];
          if (ext.execute) response = ext.execute(cmd, args, term);
          if (response !== false) break;
        }
        if (response === false) response = cmd + ': command not found';
        output(response);
      }

      // Show the command line.
      _inputLine.classList.remove('hidden');
    }

    this.processCommand = function(line) {
      _cmdLine.value = line;
      var e = new Event('keydown');
      e.keyCode = 13;
      _cmdLine.dispatchEvent(e);
    }

    this.subscribe = function(callback) {
      _cmdListeners.push(callback);
    }

    this.clear = function() {
      _output.innerHTML = '';
      _cmdLine.value = '';
      _background.style.minHeight = '';
    }

    output = function(html) {
      _output.insertAdjacentHTML('beforeEnd', html);
      _cmdLine.scrollIntoView();
    }
    this.output = this.print= output;
    this.println=function(html){
      this.print('<br/>'+html);
    }
    this.setPrompt = function(prompt) { 
      _prompt.innerHTML = prompt + options.separator; 
    }

    this.getPrompt = function() {
      return _prompt.innerHTML.replace(new RegExp(options.separator + '$'), '');     }

    this.setTheme = function(theme) {
      _terminal.classList.remove('terminal-' + options.theme);
      options.theme = theme;
      _terminal.classList.add('terminal-' + options.theme);
    }

    this.getTheme = function() {
      return options.theme;
    }

    term = this;
    return term;
  };

  // node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Terminal;

  // amd
  } else if (typeof define == 'function' && define.amd) {
    define(function () {
      return Terminal;
    });

  // web browsers
  } else {
    var oldTerminal = global.Terminal;
    Terminal.noConflict = function () {
      global.Terminal = oldTerminal;
      return Terminal;
    };
    global.Terminal = Terminal;
  }

})(this);
