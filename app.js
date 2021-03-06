import React, { Component } from 'react';
import { View, Text, StyleSheet, Platform, ListView, Keyboard, AsyncStorage, ActivityIndicator } from 'react-native';
import Header from "./header";
import Footer from "./footer";
import Row from "./row";

const filterItems = (filter, items) => {
  return items.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "COMPLETED") return item.complete;
    if (filter === "ACTIVE") return !item.complete;
  });
};

const sortItems = (items) => {
  items.sort(function(a, b) {
    return b.priority - a.priority;
  });
};

class App extends Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      loading: true,
      allComplete: false,
      filter: "ALL",
      value: "",
      items: [],
      dataSource: ds.cloneWithRows([])
    }
    this.setSource = this.setSource.bind(this);
    this.handleAddItem = this.handleAddItem.bind(this);
    this.handleToggleComplete = this.handleToggleComplete.bind(this);
    this.handleToggleAllComplete = this.handleToggleAllComplete.bind(this);
    this.handleRemoveItem = this.handleRemoveItem.bind(this);
    this.handleFilter = this.handleFilter.bind(this);
    this.handleClearComplete = this.handleClearComplete.bind(this);
    this.handleUpdateText = this.handleUpdateText.bind(this);
    this.handleToggleEditing = this.handleToggleEditing.bind(this);
    this.handleMoveUp = this.handleMoveUp.bind(this);
    this.handleMoveDown = this.handleMoveDown.bind(this);
  }
  componentWillMount() {
    AsyncStorage.getItem("items").then((json) => {
      try {
        const items = JSON.parse(json);
        sortItems(items);
        this.setSource(items, items, {loading: false});
      } catch(e) {
        this.setState({
          loading: false
        });
      }
    });
  }
  setSource(items, itemsDatasource, otherState) {
    this.setState({
      items,
      dataSource: this.state.dataSource.cloneWithRows(itemsDatasource),
      ...otherState
    });
    AsyncStorage.setItem("items", JSON.stringify(items));
  }
  handleUpdateText(key, text) {
    const newItems = this.state.items.map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        text
      }
    });
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleToggleEditing(key, editing) {
    const newItems = this.state.items.map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        editing
      }
    });
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleToggleComplete(key, complete) {
    const newItems = this.state.items.map((item) => {
      if (item.key !== key) return item;
      return {
        ... item,
        complete
      }
    });
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleToggleAllComplete() {
    const complete = !this.state.allComplete;
    const newItems = this.state.items.map((item) => ({
      ...item,
      complete
    }));
    this.setSource(newItems, filterItems(this.state.filter, newItems), { allComplete: complete })
  }
  handleAddItem() {
    if (!this.state.value) return;
    const newItems = [
      ...this.state.items,
      {
        key: Date.now(),
        text: this.state.value.trim(),
        complete: false,
        priority: 0
      }
    ];
    sortItems(newItems);
    this.setSource(newItems, filterItems(this.state.filter, newItems), { value: ""});
  }
  handleRemoveItem(key) {
    const newItems = this.state.items.filter((item) => {
      return item.key !== key;
    });
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleFilter(filter) {
    this.setSource(this.state.items, filterItems(filter, this.state.items), {filter});
  }
  handleClearComplete() {
    const newItems = filterItems("ACTIVE", this.state.items);
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleMoveUp(key) {
    const newItems = this.state.items.map((item) => {
      if (item.key === key) {
        let newPriority = item.priority < 10 ? item.priority++ : 10;
        return {
          ...item,
          newPriority
        }
      }
      return item;
    });
    sortItems(newItems);
    this.setSource(newItems, filterItems(this.state.filter, newItems));
  }
  handleMoveDown(key) {
    const newItems = this.state.items.map((item) => {
      if (item.key === key) {
        let newPriority = item.priority >= 1 ? item.priority-- : 0;
        return {
          ...item,
          newPriority
        }
      }
      return item;
    });
    sortItems(newItems);
    this.setSource(newItems, filterItems(this.state.filter, newItems));

  }
  render() {
    return (
      <View style={styles.container}>
        <Header
          value={this.state.value}
          onAddItem={this.handleAddItem}
          onChange={(value) => this.setState({value })}
          onToggleAllComplete={this.handleToggleAllComplete}
        />
        <View style={styles.content}>
          <ListView
            style={styles.list}
            enableEmptySections
            dataSource={this.state.dataSource}
            onScroll={() => Keyboard.dismiss()}
            renderRow={({key, ...value}) => {
              return (
                <Row
                  key={key}
                  onUpdate={(text) => this.handleUpdateText(key, text)}
                  onToggleEdit={(editing) => this.handleToggleEditing(key, editing)}
                  onMoveUp={() => this.handleMoveUp(key)}
                  onMoveDown={() => this.handleMoveDown(key)}
                  onComplete={(complete) => this.handleToggleComplete(key, complete)}
                  onRemove={() => this.handleRemoveItem(key)}
                  {...value}
                />
              )
            }}
            renderSeparator={(sectionId, rowId) => {
              return <View key={rowId} style={styles.separator} />
            }}
          />
        </View>
        <Footer
          onFilter={this.handleFilter}
          filter={this.state.filter}
          count={filterItems("ACTIVE", this.state.items).length}
          onClearComplete={this.handleClearComplete}
        />
        {this.state.loading && <View style={styles.loading}>
          <ActivityIndicator
            animating
            size="large"
          />
        </View>}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    ...Platform.select({
      ios: {
        paddingTop: 30
      }
    })
  },
  content: {
    flex: 1
  },
  list: {
    backgroundColor: "#FFF"
  },
  separator: {
    borderWidth: 1,
    borderColor: "#F5F5F5"
  },
  loading: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, .2)"
  }
});

export default App;