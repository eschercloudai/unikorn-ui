<script>
	import Menu from '../Menu.svelte';
	import MenuItem from '../MenuItem.svelte';
	import SubMenu from '../SubMenu.svelte';
	import Modal from '../Modal.svelte';

	let showmenu = false;

	function toggleMenu() {
		showmenu = !showmenu;
	}

	/*
function modalDismiss(e) {
  if(e.target.id == 'modal-backdrop') {
	  element = document.getElementById('modal-backdrop');
	  element.style.visibility = 'hidden';
	  element.style.opacity = '0%';
	}
}
addEventListener('click', modalDismiss);
*/
</script>

<!--
<Modal>
	<div class="login-modal-header">
		<img id="logo" src="img/Horizontal_AI.png"/>
	</div>
	<h2>Login</h2>
	<input type="text" id="username" placeholder="Username" autocomplete="username"/>
	<input type="password" id="password" placeholder="Password" autocomplete="current-password"/>
	<button type="submit">Submit</button>
</Modal>
-->

<header>
	<span id="hamburger" on:click={toggleMenu}>
		<iconify-icon id="hamburger-icon" icon="material-symbols:menu" />
		<label for="hamburger-icon">Menu</label>
	</span>
	<img id="logo" src="img/Horizontal_AI.png" />
</header>

<nav class:showmenu>
	<div class="nav-group user">
		<img src="https://www.gravatar.com/avatar/4be664eabb39ff7d1ac5085bfa19cada" />
		s.murray@eschercloud.ai
		<iconify-icon icon="material-symbols:logout" />
	</div>

	<div class="nav-group project">
		<label for="project-select">Project:</label>
		<select id="project-select" name="project">
			<option>simon</option>
		</select>
	</div>

	<Menu expanded="true">
		<MenuItem label="Dashboard" icon="ri:dashboard-3-line" />
		<SubMenu label="Kubetnetes" icon="mdi:kubernetes">
			<MenuItem label="Control Planes" />
			<MenuItem label="Clusters" />
		</SubMenu>
	</Menu>
</nav>

<main class:showmenu>
	<h1>A Title</h1>
	<p>
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. In et orci orci. Cras purus diam,
		euismod vel magna non, elementum auctor ante. Proin vulputate congue turpis ac vulputate. Donec
		fermentum sollicitudin libero et interdum. Quisque non ante id magna fermentum varius. Proin
		ultrices neque ac neque iaculis ultrices. Praesent tincidunt, purus vel accumsan imperdiet,
		purus arcu varius lectus, in mollis lorem metus vitae dolor. Maecenas vitae nibh vel ex blandit
		egestas a id metus. Ut sit amet elementum ex. Phasellus nec mollis mauris. Quisque at ligula
		libero. Donec porttitor quam et sem fringilla malesuada. Nullam facilisis elit diam.
	</p>

	<p>
		Quisque porta consectetur tortor, id pellentesque nisi semper et. Etiam sollicitudin purus a
		risus porttitor, eu aliquet lacus tempor. Vestibulum eget justo tellus. Morbi interdum neque vel
		magna posuere, quis consectetur odio sagittis. Praesent ex nulla, porta in diam a, euismod
		tristique enim. Cras hendrerit leo lorem, sed pulvinar erat laoreet sed. Aenean blandit lacus
		eget magna vehicula, et faucibus dolor imperdiet. Maecenas fermentum nisl a quam consequat, in
		egestas dui fermentum. Mauris et condimentum lectus. Morbi vitae tempor erat. Donec semper
		vulputate elit, ut auctor ligula blandit vitae. Donec gravida pellentesque lacus ut sodales.
		Curabitur ut libero orci. Curabitur ultrices mauris a magna iaculis faucibus. Aenean aliquet
		velit eget posuere mattis. Nunc iaculis ullamcorper purus commodo vulputate.
	</p>

	<p>
		Nulla nec ligula venenatis, mollis erat vitae, sagittis sem. Quisque semper quam sed venenatis
		elementum. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos
		himenaeos. Vivamus semper laoreet nisi, nec volutpat lectus auctor vel. Aliquam congue purus in
		orci iaculis, ut rhoncus velit finibus. Donec fringilla lacus et tellus tincidunt euismod.
		Aliquam erat volutpat. Etiam tortor nulla, ultrices ac euismod et, facilisis sed odio. Proin a
		dolor convallis nisl sodales volutpat. Sed finibus tortor nec nulla cursus convallis. Donec quis
		auctor lectus.
	</p>
</main>

<style>
	/* Global constants */
	:global(:root) {
		/* Brand color palette */
		--brand: hsl(295, 21%, 48%);
		--brand-light: hsl(295, 21%, 60%);
		--brand-dark: hsl(295, 21%, 36%);

		/* Generic colors */
		--light-grey: rgb(240, 240, 240);
		--mid-grey: rgb(128, 128, 128);
		--dark-grey: rgb(96, 96, 96);

		/* Various stylings to keep consistency */
		--radius: 0.5em;
		--shadow-radius: 0.5em;
		--padding: 1em;
	}

	/* Global styles */
	:global(html) {
		font-family: sans;
	}
	:global(body) {
		margin: 0;
	}
	:global(h1, h2, h3, h4, h5, h6) {
		color: var(--brand);
		margin-top: 0;
	}
	:global(a:link, a:visited) {
		color: var(--brand);
	}
	:global(a:hover) {
		color: var(--brand-light);
	}
	:global(input) {
		transition: all 0.2s ease-in;
		margin: 0.5em;
		font-size: 1em;
		border: 1px solid var(--mid-grey);
		padding: 10px;
		border-radius: var(--radius);
	}
	:global(input:focus) {
		outline: none;
		box-shadow: 0 0 var(--shadow-radius) var(--brand);
	}
	:global(button) {
		color: white;
		background-color: var(--brand);
		padding: 0.5em;
		margin: 0.5em;
		border-radius: var(--radius);
		border: 1px outset var(--brand);
		box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
		font-size: 1em;
	}
	:global(button:hover) {
		background-color: var(--brand-light);
		border-color: var(--brand-light);
	}
	:global(button:focus) {
		background-color: var(--brand-dark);
		border-color: var(--brand-dark);
	}
	:global(select) {
		color: var(--mid-grey);
		background-color: var(--light-grey);
		padding: 0.5em;
		font-size: 1em;
		border: 1px solid var(--mid-grey);
		border-radius: var(--radius);
		width: auto;
	}
	:global(iconify-icon) {
		font-size: 2em;
	}

	/* Main layout - standard "Holy Grail" */
	:global(.container) {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
	header {
		position: fixed;
		top: 0;
		width: 100%;
		padding: 0.5em;
		background-color: white;
		border-bottom: 0.25em solid var(--brand);
		z-index: 2;
		text-align: center;
	}
	nav {
		position: fixed;
		padding-top: 3.25em;
		width: 0;
		height: 100vh;
		overflow-x: hidden;
		z-index: 1;
		display: flex;
		flex-direction: column;
		color: var(--mid-grey);
		background-color: white;
		transition: all 0.3s ease-in-out;
	}
	main {
		background-color: var(--light-grey);
		padding: 4.25em 1em;
		flex: 1;
		transition: all 0.3s ease-in-out;
		box-shadow: inset 0 0 var(--shadow-radius) var(--mid-grey);
	}

	/* Header/masthead styling */
	#hamburger {
		display: flex;
		flex-direction: column;
		align-items: center;
		float: left;
	}
	#hamburger > iconify-icon {
		font-size: 1.5em;
	}
	#hamburger > label {
		font-size: 0.5em;
	}
	header > img {
		max-height: 2em;
		margin-right: 2em;
	}

	/* Nav styling */
	.nav-group {
		display: flex;
		align-items: center;
		padding: 1em;
		border-bottom: 1px solid var(--brand);
	}
	nav > .user {
		font-size: 0.8em;
		justify-content: space-between;
	}
	nav > .user img {
		max-height: 2em;
		margin-right: 10px;
		border-radius: 1em;
		border: 1px solid black;
	}
	nav > .project select {
		margin-left: 0.5em;
		width: 100%;
	}
	nav.showmenu {
		width: 100%;
	}

	/* Login modal styling */
	.login-modal-header {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1em;
		background-color: white;
		border-bottom: 5px solid var(--brand);
		border-radius: var(--radius) var(--radius) 0 0;
		box-shadow: 0 0 var(--shadow-radius) var(--mid-grey);
	}

	.login-modal {
		background-color: var(--light-grey);
		padding-bottom: 1em;
	}

	.login-modal-header > img {
		padding: 2em 5em;
		width: 15em;
		max-width: 20em;
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		nav.showmenu {
			width: 300px;
		}
		main.showmenu {
			margin-left: 300px;
		}
	}
</style>
