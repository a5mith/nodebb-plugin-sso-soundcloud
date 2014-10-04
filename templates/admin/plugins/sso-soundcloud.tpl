<h1><i class="fa fa-facebook-square"></i>Soundcloud Social Authentication</h1>
<hr />

<form>
	<div class="alert alert-warning">
		<p>
			Create a <strong>SoundCloud Application</strong> via the
			<a href="http://soundcloud.com/you/apps">SoundCloud Developers Page</a> and
			then paste your application details here.
		</p>
		<br />
		<input type="text" data-field="social:soundcloud:app_id" title="Application ID" class="form-control input-lg" placeholder="App ID"><br />
		<input type="text" data-field="social:soundcloud:secret" title="Application Secret" class="form-control input-md" placeholder="App Secret"><br />
	</div>
</form>

<button class="btn btn-lg btn-primary" id="save">Save</button>

<script>
	require(['forum/admin/settings'], function(Settings) {
		Settings.prepare();
	});
</script>