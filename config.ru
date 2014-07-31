use Rack::Static, :urls => [''], :root => 'public', :index => 'index.html'
run lambda {|env|}
